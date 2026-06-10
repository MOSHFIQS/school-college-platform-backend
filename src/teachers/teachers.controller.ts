import {
  Controller, Get, Post, Put, Body, Param,
  Query, UseGuards, UseInterceptors, UploadedFile,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { multerMemoryStorage, imageFileFilter, MAX_FILE_SIZE } from '../cloudinary/multer.config';

@ApiTags('teachers')
@Controller('teachers')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class TeachersController {
  constructor(private readonly svc: TeachersService) {}

  @Public()
  @Get('directory')
  @ApiOperation({
    summary: 'Public teacher directory',
    description: 'Returns all active teachers with name, designation, qualification, photo, and subjects. Used on the public school website — no auth needed.',
  })
  @ApiResponse({ status: 200, schema: { example: { data: [{ fullName: 'Md. Abdur Rahman', designation: 'Senior Teacher', qualification: 'M.Sc. Mathematics', teacherSubjects: [{ subject: { name: 'Mathematics', class: { name: 'Class 9' } } }] }] } } })
  directory() { return this.svc.getPublicDirectory(); }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Create teacher account',
    description:
      '## Creates Teacher + User account\n\n' +
      'A **temporary password** is auto-generated and returned **once** (not stored in plain text).\n\n' +
      '**Give the temp password to the teacher** — they must change it on first login.\n\n' +
      'Format: `T{employeeId}@{randomDigits}` (e.g. `TEMP001@4823`)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', example: 'EMP-002' },
        fullName: { type: 'string', example: 'Sharmin Akter' },
        fullNameBn: { type: 'string', example: 'শারমিন আক্তার' },
        designation: { type: 'string', example: 'Assistant Teacher' },
        qualification: { type: 'string', example: 'B.Ed, B.Sc.' },
        gender: { type: 'string', example: 'FEMALE' },
        joiningDate: { type: 'string', example: '2022-01-15' },
        phone: { type: 'string', example: '01811000002' },
        email: { type: 'string', example: 'sharmin@school.edu.bd' },
        photo: { type: 'string', format: 'binary', description: 'Teacher profile photo' },
      },
    },
  })
  @ApiResponse({
    status: 201, description: 'Teacher created. tempPassword shown once — give to teacher.',
    schema: { example: { data: { teacher: { id: 'cuid', employeeId: 'EMP-002', fullName: 'Sharmin Akter' }, tempPassword: 'TEMP002@4823' } } },
  })
  @ApiResponse({ status: 409, description: 'Employee ID already exists' })
  @UseInterceptors(FileInterceptor('photo', { storage: multerMemoryStorage, fileFilter: imageFileFilter, limits: { fileSize: MAX_FILE_SIZE } }))
  create(
    @Body() body: any,
    @CurrentUser('id') adminId: string,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.svc.create(body, adminId, photo);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all teachers (admin)', description: 'Paginated teacher list with class/section/subject assignments.' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, employee ID, or designation' })
  @ApiQuery({ name: 'page',   required: false, example: 1 })
  @ApiQuery({ name: 'limit',  required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated teachers' })
  findAll(
    @Query('search') search?: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page?:  number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) { return this.svc.findAll(search, page, limit); }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get teacher profile', description: 'Returns full teacher details with all academic assignments.' })
  @ApiParam({ name: 'id', description: 'Teacher CUID' })
  @ApiResponse({ status: 200, description: 'Teacher profile' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update teacher profile', description: 'Update teacher info. Optionally upload a new profile photo.' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Teacher CUID' })
  @ApiBody({ schema: { type: 'object', properties: { designation: { type: 'string' }, qualification: { type: 'string' }, photo: { type: 'string', format: 'binary', description: 'Profile photo' } } } })
  @ApiResponse({ status: 200, description: 'Teacher updated' })
  @UseInterceptors(FileInterceptor('photo', { storage: multerMemoryStorage, fileFilter: imageFileFilter, limits: { fileSize: MAX_FILE_SIZE } }))
  update(
    @Param('id') id: string,
    @Body() data: any,
    @UploadedFile() photo?: Express.Multer.File,
  ) { return this.svc.update(id, data, photo); }

  @Put(':id/toggle-active')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Activate / deactivate teacher', description: 'Deactivated teachers cannot log in. Also deactivates their linked user account.' })
  @ApiParam({ name: 'id', description: 'Teacher CUID' })
  @ApiBody({ schema: { example: { isActive: false } } })
  @ApiResponse({ status: 200, description: 'Status changed' })
  toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.svc.toggleActive(id, isActive);
  }

  @Put(':id/reset-password')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Reset teacher password (admin)',
    description: 'Generates a new temporary password and sets `mustChangePassword = true`. Returns temp password once — give it to the teacher.',
  })
  @ApiParam({ name: 'id', description: 'Teacher CUID' })
  @ApiResponse({ status: 200, description: 'Password reset. tempPassword returned.', schema: { example: { data: { tempPassword: 'TEMP001@9821' } } } })
  resetPassword(@Param('id') id: string) { return this.svc.resetPassword(id); }

  @Put(':id/assign-classes')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Assign teacher to classes', description: 'Replaces all current class assignments with the new list.' })
  @ApiParam({ name: 'id', description: 'Teacher CUID' })
  @ApiBody({ schema: { example: { classIds: ['class_cuid_1', 'class_cuid_2'] } } })
  @ApiResponse({ status: 200, description: 'Classes assigned' })
  assignClasses(@Param('id') id: string, @Body('classIds') classIds: string[]) {
    return this.svc.assignClasses(id, classIds);
  }

  @Put(':id/assign-sections')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Assign teacher to sections' })
  @ApiParam({ name: 'id', description: 'Teacher CUID' })
  @ApiBody({ schema: { example: { sectionIds: ['section_cuid_1'] } } })
  @ApiResponse({ status: 200, description: 'Sections assigned' })
  assignSections(@Param('id') id: string, @Body('sectionIds') sectionIds: string[]) {
    return this.svc.assignSections(id, sectionIds);
  }

  @Put(':id/assign-subjects')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Assign teacher to subjects', description: 'Replaces all current subject assignments.' })
  @ApiParam({ name: 'id', description: 'Teacher CUID' })
  @ApiBody({ schema: { example: { subjectIds: ['subject_cuid_1', 'subject_cuid_2'] } } })
  @ApiResponse({ status: 200, description: 'Subjects assigned' })
  assignSubjects(@Param('id') id: string, @Body('subjectIds') subjectIds: string[]) {
    return this.svc.assignSubjects(id, subjectIds);
  }
}
