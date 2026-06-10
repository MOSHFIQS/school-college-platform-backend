import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Post('admin')
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Create Admin account (Super Admin only)',
    description:
      '## Super Admin creates Admin\n\n' +
      'Only Super Admin can create Admin accounts.\n\n' +
      'Returns a one-time `tempPassword` — give it to the admin. They must change it on first login.',
  })
  @ApiBody({ schema: { example: { email: 'admin@school.edu.bd', phone: '01700000001' } } })
  @ApiResponse({ status: 201, description: 'Admin created. tempPassword returned.', schema: { example: { data: { user: { id: 'cuid', email: 'admin@school.edu.bd', role: 'ADMIN' }, tempPassword: 'Admin@4821' } } } })
  @ApiResponse({ status: 409, description: 'Email or phone already in use' })
  createAdmin(@CurrentUser('id') superAdminId: string, @Body() data: any) {
    return this.svc.createAdmin(data, superAdminId);
  }

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'List all user accounts (Super Admin only)', description: 'Filter by role. Returns account info without passwords.' })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'User accounts' })
  findAll(
    @Query('role') role?: Role,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) { return this.svc.findAll(role, page, limit); }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get user account by ID' })
  @ApiParam({ name: 'id', description: 'User CUID' })
  @ApiResponse({ status: 200, description: 'User account info' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Put(':id/toggle-active')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Activate / deactivate user account',
    description: 'Deactivated users cannot log in. Admins can deactivate teachers and students. Super Admin can deactivate admins.',
  })
  @ApiParam({ name: 'id', description: 'User CUID' })
  @ApiBody({ schema: { example: { isActive: false } } })
  @ApiResponse({ status: 200, description: 'Account status updated' })
  toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.svc.toggleActive(id, isActive);
  }

  @Put(':id/reset-password')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Reset any user password (admin/super admin)', description: 'Generates temp password and sets `mustChangePassword = true`. Returns temp password once.' })
  @ApiParam({ name: 'id', description: 'User CUID' })
  @ApiResponse({ status: 200, description: 'Password reset', schema: { example: { data: { tempPassword: 'Reset@8823' } } } })
  resetPassword(@Param('id') id: string) { return this.svc.resetPassword(id); }
}
