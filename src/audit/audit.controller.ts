import { Controller, Get, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
@Roles('SUPER_ADMIN')
export class AuditController {
  constructor(private readonly svc: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'View audit logs (Super Admin only)',
    description:
      '## System Audit Trail\n\n' +
      'All critical actions are logged: `CREATE_STUDENT`, `APPROVE_ADMISSION`, `PUBLISH_RESULT`, `REVOKE_CERTIFICATE`, etc.\n\n' +
      'Only accessible by **Super Admin**. Includes user info, old/new data, IP address, and timestamp.',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user CUID' })
  @ApiQuery({ name: 'entityType', required: false, example: 'Student', description: 'e.g. Student, Admission, Result' })
  @ApiQuery({ name: 'action', required: false, example: 'APPROVE_ADMISSION', description: 'Partial match on action name' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Audit log entries',
    schema: {
      example: {
        data: [{
          id: 'cuid', action: 'APPROVE_ADMISSION', entityType: 'Admission', entityId: 'adm_cuid',
          user: { email: 'admin@school.edu.bd', role: 'ADMIN' },
          ipAddress: '103.x.x.x', createdAt: '2025-06-01T10:00:00Z',
        }],
      },
    },
  })
  findAll(
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) { return this.svc.findAll(userId, entityType, action, page, limit); }
}
