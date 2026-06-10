import {
  Controller, Post, Get, Body, Req, Res,
  UseGuards, HttpCode, HttpStatus, Ip,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth,
  ApiBody, ApiResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard, MustChangePasswordGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  LoginDto, ChangePasswordDto,
  ForgotPasswordDto, ResetPasswordDto,
} from './dto/auth.dto';

const COOKIE_OPTS = (prod: boolean) => ({
  httpOnly: true,
  secure:   prod,
  sameSite: 'strict' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/api/v1/auth',
});

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard)
export class AuthController {
  private readonly isProd = process.env.NODE_ENV === 'production';

  constructor(private readonly authService: AuthService) {}

  // ── POST /auth/login ───────────────────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description:
      '## Login to BD School Portal\n\n' +
      'Accepts **email**, **phone number**, **student ID** (`STU-2025-0001`), or **teacher employee ID** (`EMP-001`).\n\n' +
      '### On Success:\n' +
      '- Returns `accessToken` (15 min) → paste into **Authorize 🔒** above as `Bearer <token>`\n' +
      '- Sets `refreshToken` as **httpOnly cookie** (7 days) automatically\n' +
      '- If `mustChangePassword = true`, user **must** call `POST /auth/change-password` before accessing any other route\n\n' +
      '### Default Credentials (after seed):\n' +
      '| Role | Login | Password |\n' +
      '|------|-------|----------|\n' +
      '| Super Admin | `superadmin@school.edu.bd` | `SuperAdmin@123` |\n' +
      '| Admin | `admin@school.edu.bd` | `Admin@123` |\n' +
      '| Teacher | `EMP-001` | auto-generated (shown in seed log) |\n' +
      '| Student | `STU-2025-0001` | auto-generated (shown in seed log) |',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Refresh token set as httpOnly cookie.',
    schema: {
      example: {
        success: true, statusCode: 200,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'cuid', role: 'TEACHER', email: 'teacher@school.edu.bd',
            mustChangePassword: true,
            profile: { id: 'cuid', employeeId: 'EMP-001', fullName: 'Md. Rahman' },
          },
        },
        timestamp: '2025-01-01T08:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account deactivated' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, ip);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTS(this.isProd));
    return result;
  }

  // ── POST /auth/refresh ─────────────────────────────────────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('cookieAuth')
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Uses the **`refreshToken` httpOnly cookie** to issue a new `accessToken`.\n\n' +
      'In Swagger UI, the cookie is sent automatically if you logged in from this browser tab ' +
      '(because `withCredentials: true` is set).\n\n' +
      'The old token remains valid until expiry — implement server-side token rotation in production.',
  })
  @ApiResponse({
    status: 200, description: 'New access token issued',
    schema: { example: { data: { accessToken: 'eyJ...', refreshToken: 'eyJ...' } } },
  })
  @ApiResponse({ status: 401, description: 'Cookie missing or refresh token invalid/expired' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) throw new Error('Refresh token cookie missing');
    const result = await this.authService.refresh(token);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTS(this.isProd));
    return result;
  }

  // ── POST /auth/logout ──────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiCookieAuth('cookieAuth')
  @ApiOperation({
    summary: 'Logout',
    description: 'Clears the `refreshToken` cookie. The access token expires naturally after 15 minutes.',
  })
  @ApiResponse({ status: 200, description: 'Logged out' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    return { message: 'Logged out successfully' };
  }

  // ── GET /auth/me ───────────────────────────────────────────────────────────
  @Get('me')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the authenticated user\'s basic info from the JWT payload (validated against DB).',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        data: {
          id: 'cuid', role: 'TEACHER', email: 'teacher@school.edu.bd',
          isActive: true, mustChangePassword: false,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Must change password first' })
  me(@CurrentUser() user: any) { return user; }

  // ── POST /auth/change-password ─────────────────────────────────────────────
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Change password',
    description:
      '## First-Login Password Change\n\n' +
      'When `mustChangePassword = true`, this is the **only** endpoint accessible (besides logout).\n\n' +
      'After a successful call:\n' +
      '- `mustChangePassword` is set to `false`\n' +
      '- New tokens are returned — replace your `accessToken` in **Authorize 🔒**\n' +
      '- Full portal access is granted\n\n' +
      'Also works for self-service password changes anytime.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed. New tokens returned.',
    schema: {
      example: {
        data: { message: 'Password changed successfully', accessToken: 'eyJ...', refreshToken: 'eyJ...' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Current password incorrect or new == old' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(userId, dto);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTS(this.isProd));
    return result;
  }

  // ── POST /auth/forgot-password ─────────────────────────────────────────────
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset OTP',
    description:
      'Sends a 6-digit OTP to the user\'s registered phone (SMS) or email.\n\n' +
      'Always returns success — never reveals if the account exists.\n\n' +
      'OTP expires in 10 minutes.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'OTP sent if account exists' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // ── POST /auth/reset-password ──────────────────────────────────────────────
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with OTP',
    description: 'Validates the OTP from `/forgot-password` and sets a new password.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
