import {
  Controller, Get, Put, Post, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { multerMemoryStorage, imageFileFilter, MAX_FILE_SIZE } from '../cloudinary/multer.config';

@ApiTags('students')
@Controller('students')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class StudentsController {
  constructor(private readonly svc: StudentsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  @ApiOperation({
    summary: 'List students',
    description: 'Paginated list with latest session/class/section. Filter by session, class, or section.',
  })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'classId',   required: false })
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiQuery({ name: 'search',    required: false, description: 'Search by name, student ID, or father name' })
  @ApiQuery({ name: 'page',      required: false, example: 1 })
  @ApiQuery({ name: 'limit',     required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated students with latest enrollment' })
  findAll(
    @Query('sessionId') sessionId?: string,
    @Query('classId')   classId?:   string,
    @Query('sectionId') sectionId?: string,
    @Query('search')    search?:    string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page?:  number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) { return this.svc.findAll(sessionId, classId, sectionId, search, page, limit); }

  @Get('my-profile')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Get own profile (student)', description: 'Returns the logged-in student\'s own profile with enrollment, attendance, and leave info.' })
  @ApiResponse({ status: 200, description: 'Student profile' })
  myProfile(@CurrentUser('id') userId: string) {
    // find student by userId
    return this.svc['prisma'].student.findUnique({
      where: { userId },
      include: {
        sessions: { include: { session: true, section: { include: { class: true } } }, orderBy: { createdAt: 'desc' }, take: 1 },
        user: { select: { email: true, phone: true } },
      },
    });
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT')
  @ApiOperation({ summary: 'Get student by ID', description: 'Full profile with all sessions, recent attendance, leave applications, and linked admission.' })
  @ApiParam({ name: 'id', description: 'Student CUID' })
  @ApiResponse({ status: 200, description: 'Student profile' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update student profile', description: 'Update personal info, guardian details, or address. Optionally upload a new profile photo.' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Student CUID' })
  @ApiBody({ schema: { type: 'object', properties: { phone: { type: 'string' }, guardianPhone: { type: 'string' }, district: { type: 'string' }, bloodGroup: { type: 'string' }, photo: { type: 'string', format: 'binary', description: 'Profile photo' } } } })
  @ApiResponse({ status: 200, description: 'Student updated' })
  @UseInterceptors(FileInterceptor('photo', { storage: multerMemoryStorage, fileFilter: imageFileFilter, limits: { fileSize: MAX_FILE_SIZE } }))
  update(
    @Param('id') id: string,
    @Body() data: any,
    @UploadedFile() photo?: Express.Multer.File,
  ) { return this.svc.update(id, data, photo); }

  @Put(':id/toggle-active')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Activate / deactivate student', description: 'Deactivated students cannot log in. Also disables the linked user account.' })
  @ApiParam({ name: 'id', description: 'Student CUID' })
  @ApiBody({ schema: { example: { isActive: false } } })
  @ApiResponse({ status: 200, description: 'Status changed' })
  toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.svc.toggleActive(id, isActive);
  }

  @Put(':id/reset-password')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Reset student password (admin)',
    description: 'Generates a new temporary password and sets `mustChangePassword = true`. Give temp password to student.',
  })
  @ApiParam({ name: 'id', description: 'Student CUID' })
  @ApiResponse({ status: 200, schema: { example: { data: { tempPassword: 'StuSTU20250001@1234' } } } })
  resetPassword(@Param('id') id: string) { return this.svc.resetPassword(id); }

  @Get(':id/enrollment')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT')
  @ApiOperation({ summary: 'Get student current enrollment', description: 'Returns the latest session, class, section, and roll number for this student.' })
  @ApiParam({ name: 'id', description: 'Student CUID' })
  @ApiResponse({ status: 200, description: 'Current enrollment record' })
  getCurrentEnrollment(@Param('id') id: string) { return this.svc.getCurrentEnrollment(id); }

  @Post(':id/enroll')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Enroll student in a session', description: 'Creates a new `StudentSession` record. Use this to manually enroll or re-enroll a student.' })
  @ApiParam({ name: 'id', description: 'Student CUID' })
  @ApiBody({ schema: { example: { sessionId: 'session_cuid', classId: 'class_cuid', sectionId: 'section_cuid', rollNumber: '2026601' } } })
  @ApiResponse({ status: 201, description: 'Student enrolled' })
  @ApiResponse({ status: 400, description: 'Already enrolled in this session' })
  enroll(@Param('id') studentId: string, @Body() body: any) {
    return this.svc.enroll(studentId, body.sessionId, body.classId, body.sectionId, body.rollNumber);
  }

  @Post(':id/promote')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Promote student to next session',
    description:
      '## Student Promotion\n\n' +
      'Marks current `StudentSession` as `isPromoted = true` and creates a new `StudentSession` for the new session.\n\n' +
      'The core `Student` record stays unchanged — only the enrollment row changes.\n\n' +
      'Roll number, class, and section are reassigned for the new year.',
  })
  @ApiParam({ name: 'id', description: 'Student CUID' })
  @ApiBody({ schema: { example: { newSessionId: 'session_cuid', newClassId: 'class_cuid', newSectionId: 'section_cuid', newRollNumber: '2026601' } } })
  @ApiResponse({ status: 201, description: 'Student promoted' })
  @ApiResponse({ status: 404, description: 'No existing enrollment found' })
  promote(@Param('id') studentId: string, @Body() body: any) {
    return this.svc.promote(studentId, body.newSessionId, body.newClassId, body.newSectionId, body.newRollNumber);
  }
}
