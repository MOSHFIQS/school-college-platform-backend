import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { RoutineService } from './routine.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('routine')
@Controller('routine')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class RoutineController {
  constructor(private readonly svc: RoutineService) {}

  @Public()
  @Get('section/:sectionId')
  @ApiOperation({ summary: 'Get class timetable (public)', description: 'Returns weekly timetable grouped by day (Sunday–Friday). No auth required.' })
  @ApiParam({ name: 'sectionId', description: 'Section CUID' })
  @ApiResponse({ status: 200, schema: { example: { data: [{ day: 1, dayName: 'Monday', periods: [{ period: 1, startTime: '08:00', endTime: '08:45', subject: { name: 'Mathematics' } }] }] } } })
  getSectionRoutine(@Param('sectionId') sectionId: string) { return this.svc.getSectionRoutine(sectionId); }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create/update routine entry (admin)', description: 'Upserts a period slot. dayOfWeek: 0=Sunday … 5=Friday.' })
  @ApiBody({ schema: { example: { sectionId: 'section_cuid', subjectId: 'subject_cuid', dayOfWeek: 1, period: 1, startTime: '08:00', endTime: '08:45', roomNo: '101' } } })
  @ApiResponse({ status: 201, description: 'Routine entry saved' })
  upsert(@Body() data: any) { return this.svc.upsert(data); }

  @Delete(':sectionId/:day/:period')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete routine entry (admin)' })
  @ApiParam({ name: 'sectionId', description: 'Section CUID' })
  @ApiParam({ name: 'day', description: '0–5', example: '1' })
  @ApiParam({ name: 'period', description: '1–8', example: '3' })
  @ApiResponse({ status: 200, description: 'Entry deleted' })
  delete(@Param('sectionId') sectionId: string, @Param('day') day: string, @Param('period') period: string) {
    return this.svc.delete(sectionId, parseInt(day), parseInt(period));
  }
}
