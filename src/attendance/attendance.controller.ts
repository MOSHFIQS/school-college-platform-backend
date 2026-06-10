import {
  Controller, Get, Post, Put, Body, Param,
  Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AttendanceStatus } from '@prisma/client';

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  @Post()
  @Roles('TEACHER')
  @ApiOperation({
    summary: 'Take attendance (teacher)',
    description:
      '## Daily Attendance Entry\n\n' +
      'Teachers take **one record per student per day**.\n\n' +
      '- Editable up to **2 days back**\n' +
      '- Teacher must be assigned to the section via `TeacherSection`\n' +
      '- Statuses: `PRESENT`, `ABSENT`, `LATE`, `HOLIDAY`\n' +
      '- Calling again for same date overwrites (upsert)',
  })
  @ApiBody({
    schema: {
      example: {
        sectionId: 'section_cuid', date: '2025-06-15',
        entries: [
          { studentId: 'student_cuid_1', status: 'PRESENT' },
          { studentId: 'student_cuid_2', status: 'ABSENT', note: 'Sick leave applied' },
          { studentId: 'student_cuid_3', status: 'LATE' },
        ],
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Attendance recorded', schema: { example: { data: { message: 'Attendance recorded for 35 students', present: 33, absent: 1, late: 1, holiday: 0 } } } })
  @ApiResponse({ status: 403, description: 'Not assigned to this section, or attendance older than 2 days' })
  take(@CurrentUser('id') teacherId: string, @Body() body: any) {
    return this.svc.take(teacherId, body.sectionId, body.date, body.entries);
  }

  @Get('section/:sectionId')
  @Roles('TEACHER', 'SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Get section attendance for a date (teacher/admin)',
    description: 'Returns all students in the section with their attendance status for the specified date. Useful for viewing or editing the daily register.',
  })
  @ApiParam({ name: 'sectionId', description: 'Section CUID' })
  @ApiQuery({ name: 'date', required: true, example: '2025-06-15', description: 'Format: YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Per-student attendance for the date' })
  getSectionAttendance(@Param('sectionId') sectionId: string, @Query('date') date: string) {
    return this.svc.getSectionAttendance(sectionId, date);
  }

  @Get('monthly/:sectionId')
  @Roles('TEACHER', 'SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Monthly attendance report (teacher/admin)',
    description: 'Returns per-student totals (present, absent, late) for a full month. Students below 75% are flagged with `isLowAttendance: true`.',
  })
  @ApiParam({ name: 'sectionId', description: 'Section CUID' })
  @ApiQuery({ name: 'year',  required: true, example: 2025 })
  @ApiQuery({ name: 'month', required: true, example: 6, description: '1–12' })
  @ApiResponse({ status: 200, description: 'Monthly summary per student with low-attendance flag' })
  getMonthlyReport(
    @Param('sectionId') sectionId: string,
    @Query('year',  ParseIntPipe) year:  number,
    @Query('month', ParseIntPipe) month: number,
  ) { return this.svc.getMonthlyReport(sectionId, year, month); }

  @Get('student/:studentId/calendar')
  @Roles('STUDENT', 'TEACHER', 'SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Student attendance calendar',
    description: 'Returns a day-number → status map and monthly summary. Used in student portal dashboard.',
  })
  @ApiParam({ name: 'studentId', description: 'Student CUID' })
  @ApiQuery({ name: 'year',  required: true, example: 2025 })
  @ApiQuery({ name: 'month', required: true, example: 6 })
  @ApiResponse({
    status: 200, schema: {
      example: { data: { year: 2025, month: 6, calendar: { 1: 'PRESENT', 2: 'ABSENT', 3: 'LATE' }, summary: { present: 18, absent: 2, late: 1, total: 21, percentage: 90 } } },
    },
  })
  getStudentCalendar(
    @Param('studentId') studentId: string,
    @Query('year',  ParseIntPipe) year:  number,
    @Query('month', ParseIntPipe) month: number,
  ) { return this.svc.getStudentCalendar(studentId, year, month); }

  @Put('override')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Admin override attendance record',
    description: 'Admin/Super Admin can correct any past attendance with no date restriction.',
  })
  @ApiBody({ schema: { example: { studentId: 'student_cuid', date: '2025-06-10', status: 'PRESENT', note: 'Medical certificate provided' } } })
  @ApiResponse({ status: 200, description: 'Attendance record updated' })
  adminOverride(@CurrentUser('id') adminId: string, @Body() body: any) {
    return this.svc.adminOverride(adminId, body.studentId, body.date, body.status as AttendanceStatus, body.note);
  }
}
