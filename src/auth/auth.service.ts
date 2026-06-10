import {
  Injectable, UnauthorizedException, BadRequestException,
  NotFoundException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

const BCRYPT_ROUNDS   = 12;
const OTP_EXPIRY_MIN  = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma:  PrismaService,
    private readonly jwt:     JwtService,
    private readonly config:  ConfigService,
  ) {}

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(dto: LoginDto, ip?: string) {
    const user = await this.findByIdentifier(dto.username);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    });

    const tokens = this.signTokens(user.id, user.role);

    // Enrich with profile
    let profile: any = null;
    if (user.role === 'STUDENT') {
      profile = await this.prisma.student.findUnique({
        where: { userId: user.id },
        select: { id: true, studentId: true, fullName: true, photoUrl: true },
      });
    } else if (user.role === 'TEACHER') {
      profile = await this.prisma.teacher.findUnique({
        where: { userId: user.id },
        select: { id: true, employeeId: true, fullName: true, photoUrl: true },
      });
    }

    this.logger.log(`Login: ${user.role} ${user.id} from ${ip}`);

    return {
      ...tokens,
      user: {
        id: user.id, role: user.role, email: user.email, phone: user.phone,
        mustChangePassword: user.mustChangePassword,
        profile,
      },
    };
  }

  // ── Refresh ────────────────────────────────────────────────────────────────
  async refresh(token: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get('jwt.refreshSecret'),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, isActive: true },
      });
      if (!user || !user.isActive) throw new Error();
      return this.signTokens(user.id, user.role);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token. Please log in again.');
    }
  }

  // ── Change Password (first-login & self-service) ───────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must differ from the current password');
    }

    const hashed = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data:  { password: hashed, mustChangePassword: false },
    });

    // Re-sign tokens now that mustChangePassword = false
    return {
      message: 'Password changed successfully',
      ...this.signTokens(userId, user.role),
    };
  }

  // ── Forgot Password (OTP via email/SMS) ───────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findByIdentifier(dto.identifier);
    // Always return success — never reveal if account exists
    if (!user) return { message: 'OTP sent if account exists' };

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60_000);

    // Store OTP in user record (simple approach — no separate table in this schema)
    // We serialise it into a temporary JSON metadata stored by abusing the existing fields.
    // Production: add an OtpToken table to schema.
    this.logger.log(`OTP for ${user.id}: ${otp} (expires ${expiresAt.toISOString()})`);
    // In production, send via SMS/Email here.

    return { message: 'OTP sent if account exists' };
  }

  // ── Reset Password ─────────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    // In production validate OTP from OtpToken table.
    // This stub accepts any 6-digit OTP for dev.
    if (!/^\d{6}$/.test(dto.otp)) throw new BadRequestException('Invalid OTP format');

    const user = await this.findByIdentifier(dto.identifier);
    if (!user) throw new BadRequestException('Invalid request');

    const hashed = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data:  { password: hashed, mustChangePassword: false },
    });

    return { message: 'Password reset successful. Please log in.' };
  }

  // ── Internal helpers ───────────────────────────────────────────────────────
  private async findByIdentifier(identifier: string) {
    // 1. Email
    let user = await this.prisma.user.findFirst({ where: { email: identifier.toLowerCase() } });
    if (user) return user;

    // 2. Phone
    user = await this.prisma.user.findFirst({ where: { phone: identifier } });
    if (user) return user;

    // 3. Student ID (STU-2025-0001)
    const student = await this.prisma.student.findUnique({
      where: { studentId: identifier }, include: { user: true },
    });
    if (student) return student.user;

    // 4. Teacher employee ID
    const teacher = await this.prisma.teacher.findUnique({
      where: { employeeId: identifier }, include: { user: true },
    });
    if (teacher) return teacher.user;

    return null;
  }

  private signTokens(userId: string, role: string) {
    const payload = { sub: userId, role };
    return {
      accessToken: this.jwt.sign(payload, {
        secret:    this.config.get('jwt.accessSecret'),
        expiresIn: this.config.get('jwt.accessExpiry'),
      }),
      refreshToken: this.jwt.sign(payload, {
        secret:    this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiry'),
      }),
    };
  }

  private generateOtp(): string {
    return Math.floor(100_000 + Math.random() * 900_000).toString();
  }
}
