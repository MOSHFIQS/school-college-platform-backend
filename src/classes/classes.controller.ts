import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('classes')
@Controller('classes')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class ClassesController {
  constructor(private readonly svc: ClassesService) {}

  // ── Sessions ───────────────────────────────────────────────────────────────
  @Public()
  @Get('sessions')
  @ApiOperation({ summary: 'List academic sessions (public)', description: 'Returns all sessions ordered newest first. Current session has `isCurrent: true`.' })
  @ApiResponse({ status: 200, schema: { example: { data: [{ id: 'cuid', name: '2025-2026', year: 2025, isCurrent: true }] } } })
  getSessions() { return this.svc.getSessions(); }

  @Public()
  @Get('sessions/current')
  @ApiOperation({ summary: 'Get current academic session (public)' })
  @ApiResponse({ status: 200, schema: { example: { data: { id: 'cuid', name: '2025-2026', year: 2025, isCurrent: true } } } })
  getCurrentSession() { return this.svc.getCurrentSession(); }

  @Post('sessions')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create academic session', description: 'Create a new session (e.g. "2025-2026"). Only one session should be active at a time.' })
  @ApiBody({ schema: { example: { name: '2025-2026', year: 2025, startDate: '2025-01-01', endDate: '2025-12-31' } } })
  @ApiResponse({ status: 201, description: 'Session created' })
  @ApiResponse({ status: 400, description: 'Session for this year already exists' })
  createSession(@Body() body: any) { return this.svc.createSession(body.name, body.year, body.startDate, body.endDate); }

  @Put('sessions/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update academic session' })
  @ApiParam({ name: 'id', description: 'Session CUID' })
  @ApiBody({ schema: { example: { name: '2025-2026', startDate: '2025-01-01', endDate: '2025-12-31' } } })
  @ApiResponse({ status: 200, description: 'Session updated' })
  updateSession(@Param('id') id: string, @Body() data: any) { return this.svc.updateSession(id, data); }

  @Put('sessions/:id/activate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Activate session', description: 'Marks this session as current. Deactivates all others automatically.' })
  @ApiParam({ name: 'id', description: 'Session CUID' })
  @ApiResponse({ status: 200, description: 'Session activated' })
  activateSession(@Param('id') id: string) { return this.svc.activateSession(id); }

  // ── Classes ────────────────────────────────────────────────────────────────
  @Public()
  @Get()
  @ApiOperation({ summary: 'List classes with sections and subjects (public)', description: 'Returns all classes for a session with nested sections, subjects, and teacher assignments.' })
  @ApiQuery({ name: 'sessionId', required: false, description: 'Filter by session CUID. Omit for all sessions.' })
  @ApiResponse({ status: 200, description: 'Classes with sections and subjects' })
  getClasses(@Query('sessionId') sessionId?: string) { return this.svc.getClasses(sessionId); }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create class', description: 'Create a class (e.g. Class 6, HSC 1st Year) linked to a session.' })
  @ApiBody({ schema: { example: { name: 'Class 6', level: 6, shift: 'MORNING', sessionId: 'session_cuid' } } })
  @ApiResponse({ status: 201, description: 'Class created' })
  @ApiResponse({ status: 409, description: 'Class with same level/shift/session already exists' })
  createClass(@Body() body: any) { return this.svc.createClass(body.name, body.level, body.shift, body.sessionId); }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update class name or shift' })
  @ApiParam({ name: 'id', description: 'Class CUID' })
  @ApiBody({ schema: { example: { name: 'Class 6 (Updated)', shift: 'DAY' } } })
  @ApiResponse({ status: 200, description: 'Class updated' })
  updateClass(@Param('id') id: string, @Body() data: any) { return this.svc.updateClass(id, data); }

  // ── Sections ───────────────────────────────────────────────────────────────
  @Post('sections')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create section', description: 'Add a section (A, B, Science, Humanities) to a class. At HSC level, use section names like "Science" or "Commerce".' })
  @ApiBody({ schema: { example: { classId: 'class_cuid', name: 'Science', capacity: 40 } } })
  @ApiResponse({ status: 201, description: 'Section created' })
  @ApiResponse({ status: 409, description: 'Section name already exists in this class' })
  createSection(@Body() body: any) { return this.svc.createSection(body.classId, body.name, body.capacity); }

  @Put('sections/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update section capacity or name' })
  @ApiParam({ name: 'id', description: 'Section CUID' })
  @ApiBody({ schema: { example: { name: 'Science', capacity: 45 } } })
  @ApiResponse({ status: 200, description: 'Section updated' })
  updateSection(@Param('id') id: string, @Body() data: any) { return this.svc.updateSection(id, data); }

  @Put('sections/:id/class-teacher')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Assign class teacher to section', description: 'One teacher can be class teacher for only one section (enforced by DB unique constraint).' })
  @ApiParam({ name: 'id', description: 'Section CUID' })
  @ApiBody({ schema: { example: { teacherId: 'teacher_cuid' } } })
  @ApiResponse({ status: 200, description: 'Class teacher assigned' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  @ApiResponse({ status: 409, description: 'Teacher is already class teacher of another section' })
  assignClassTeacher(@Param('id') id: string, @Body('teacherId') teacherId: string) {
    return this.svc.assignClassTeacher(id, teacherId);
  }

  // ── Subjects ───────────────────────────────────────────────────────────────
  @Get(':classId/subjects')
  @ApiOperation({ summary: 'Get subjects for a class', description: 'Returns all subjects assigned to a class with their teacher assignments.' })
  @ApiParam({ name: 'classId', description: 'Class CUID' })
  @ApiResponse({ status: 200, description: 'Subject list with teacher info' })
  getSubjects(@Param('classId') classId: string) { return this.svc.getSubjectsByClass(classId); }

  @Post('subjects')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create subject', description: 'Add a subject (e.g. Mathematics, Physics) to a class. Teachers are assigned separately via the teachers module.' })
  @ApiBody({ schema: { example: { name: 'Mathematics', code: 'MATH6', classId: 'class_cuid' } } })
  @ApiResponse({ status: 201, description: 'Subject created' })
  @ApiResponse({ status: 409, description: 'Subject code already exists for this class' })
  createSubject(@Body() body: any) { return this.svc.createSubject(body.name, body.code, body.classId); }

  @Put('subjects/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update subject name or code' })
  @ApiParam({ name: 'id', description: 'Subject CUID' })
  @ApiBody({ schema: { example: { name: 'Advanced Mathematics' } } })
  @ApiResponse({ status: 200, description: 'Subject updated' })
  updateSubject(@Param('id') id: string, @Body() data: any) { return this.svc.updateSubject(id, data); }
}
