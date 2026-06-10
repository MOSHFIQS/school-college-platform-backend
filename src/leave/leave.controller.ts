import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LeaveStatus } from '@prisma/client';

@ApiTags('leave')
@Controller('leave')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class LeaveController {
  constructor(private readonly svc: LeaveService) {}

  @Post()
  @Roles('STUDENT', 'TEACHER')
  @ApiOperation({ summary: 'Apply for leave (student/teacher)', description: 'Student or teacher submits a leave request. Admin reviews it.' })
  @ApiBody({ schema: { example: { leaveType: 'SICK', fromDate: '2025-06-20', toDate: '2025-06-22', reason: 'Fever and rest recommended by doctor' } } })
  @ApiResponse({ status: 201, description: 'Leave application submitted' })
  apply(@CurrentUser('id') userId: string, @CurrentUser('role') role: string, @Body() data: any) {
    return this.svc.apply(userId, role, data);
  }

  @Get('my-applications')
  @Roles('STUDENT', 'TEACHER')
  @ApiOperation({ summary: 'My leave applications', description: 'Returns all leave applications for the logged-in student or teacher.' })
  @ApiResponse({ status: 200, description: 'Leave applications list' })
  myApplications(@CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    return this.svc.myApplications(userId, role);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all leave applications (admin)', description: 'Admin views all leave requests. Filter by status or applicant type.' })
  @ApiQuery({ name: 'status', required: false, enum: LeaveStatus })
  @ApiQuery({ name: 'applicantType', required: false, enum: ['student', 'teacher'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated leave applications' })
  findAll(
    @Query('status') status?: LeaveStatus,
    @Query('applicantType') applicantType?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) { return this.svc.findAll(status, applicantType, page, limit); }

  @Put(':id/review')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Approve or reject leave (admin)', description: 'Admin reviews the application and sets status to APPROVED or REJECTED.' })
  @ApiParam({ name: 'id', description: 'Leave application CUID' })
  @ApiBody({ schema: { example: { status: 'APPROVED', reviewNote: 'Approved. Attendance will be marked as leave.' } } })
  @ApiResponse({ status: 200, description: 'Application reviewed' })
  @ApiResponse({ status: 403, description: 'Application already reviewed' })
  review(@Param('id') id: string, @CurrentUser('id') adminId: string, @Body() body: any) {
    return this.svc.review(id, adminId, body.status as LeaveStatus, body.reviewNote);
  }
}
