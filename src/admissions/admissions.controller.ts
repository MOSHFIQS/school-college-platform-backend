import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFiles,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { AdmissionsService } from './admissions.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdmissionStatus } from '@prisma/client';
import { multerMemoryStorage, documentFileFilter, MAX_FILE_SIZE } from '../cloudinary/multer.config';

@ApiTags('admissions')
@Controller('admissions')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class AdmissionsController {
  constructor(private readonly svc: AdmissionsService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Submit admission application (public)',
    description:
      '## Public Admission Form\n\n' +
      'No login required. Any visitor can submit.\n\n' +
      'Returns an `applicationNo` (e.g. `ADM-2025-0042`) — **give this to the guardian** for tracking.\n\n' +
      '**Workflow:** Submit → Admin reviews → Approve → Student account created automatically\n\n' +
      '**File uploads:** Optionally upload applicant photo, birth certificate, and testimonial/transfer certificate.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', example: 'session_cuid' },
        classId: { type: 'string', example: 'class_cuid' },
        applicantName: { type: 'string', example: 'Md. Hasan' },
        applicantNameBn: { type: 'string', example: 'মো. হাসান' },
        dateOfBirth: { type: 'string', example: '2014-03-10' },
        gender: { type: 'string', example: 'MALE' },
        bloodGroup: { type: 'string', example: 'B+' },
        fatherName: { type: 'string', example: 'Md. Alam' },
        fatherPhone: { type: 'string', example: '01900000002' },
        motherName: { type: 'string', example: 'Begum Sufia' },
        motherPhone: { type: 'string', example: '01900000003' },
        guardianPhone: { type: 'string', example: '01900000002' },
        guardianEmail: { type: 'string', example: 'guardian@gmail.com' },
        previousSchool: { type: 'string', example: 'ABC Primary School' },
        previousClass: { type: 'string', example: 'Class 4' },
        previousGpa: { type: 'string', example: '5.00' },
        district: { type: 'string', example: 'Dhaka' },
        division: { type: 'string', example: 'Dhaka' },
        photo: { type: 'string', format: 'binary', description: 'Applicant photo' },
        birthCert: { type: 'string', format: 'binary', description: 'Birth certificate (image or PDF)' },
        testimonial: { type: 'string', format: 'binary', description: 'Previous result / transfer certificate' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Application submitted', schema: { example: { data: { id: 'cuid', applicationNo: 'ADM-2025-0042', status: 'PENDING' } } } })
  @UseInterceptors(FileFieldsInterceptor(
    [{ name: 'photo', maxCount: 1 }, { name: 'birthCert', maxCount: 1 }, { name: 'testimonial', maxCount: 1 }],
    { storage: multerMemoryStorage, fileFilter: documentFileFilter, limits: { fileSize: MAX_FILE_SIZE } },
  ))
  submit(
    @Body() data: any,
    @UploadedFiles() files?: { photo?: Express.Multer.File[]; birthCert?: Express.Multer.File[]; testimonial?: Express.Multer.File[] },
  ) {
    return this.svc.submit(data, files?.photo?.[0], files?.birthCert?.[0], files?.testimonial?.[0]);
  }

  @Public()
  @Get('track/:applicationNo')
  @ApiOperation({
    summary: 'Track application status (public)',
    description: 'Applicants can check status using the application number. Returns status (`PENDING`, `APPROVED`, `REJECTED`) and review note if rejected.',
  })
  @ApiParam({ name: 'applicationNo', example: 'ADM-2025-0042' })
  @ApiResponse({ status: 200, schema: { example: { data: { applicationNo: 'ADM-2025-0042', status: 'APPROVED', applicantName: 'Md. Hasan', reviewedAt: '2025-01-15T10:00:00Z' } } } })
  @ApiResponse({ status: 404, description: 'Application not found' })
  track(@Param('applicationNo') applicationNo: string) { return this.svc.track(applicationNo); }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List admission applications (admin)', description: 'Paginated list. Filter by status, class, or session.' })
  @ApiQuery({ name: 'status',    required: false, enum: AdmissionStatus })
  @ApiQuery({ name: 'classId',   required: false })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'page',      required: false, example: 1 })
  @ApiQuery({ name: 'limit',     required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated applications' })
  findAll(
    @Query('status')    status?:    AdmissionStatus,
    @Query('classId')   classId?:   string,
    @Query('sessionId') sessionId?: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page?:  number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) { return this.svc.findAll(status, classId, sessionId, page, limit); }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get admission detail (admin)' })
  @ApiParam({ name: 'id', description: 'Admission CUID' })
  @ApiResponse({ status: 200, description: 'Full application detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Put(':id/approve')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Approve application → create Student account',
    description:
      '## Admission Approval Flow\n\n' +
      '1. Status → `APPROVED`\n' +
      '2. `Student` record created from application data\n' +
      '3. `User` account created with **temporary password** (`mustChangePassword = true`)\n' +
      '4. `StudentSession` enrollment record created\n' +
      '5. `tempPassword` and `studentId` returned — **give to student/guardian**\n\n' +
      '⚠️ This is irreversible once approved.',
  })
  @ApiParam({ name: 'id', description: 'Admission CUID' })
  @ApiBody({ schema: { example: { sectionId: 'section_cuid', rollNumber: '2025601' } } })
  @ApiResponse({
    status: 200, description: 'Approved. Student account created.',
    schema: { example: { data: { studentId: 'STU-2025-0001', tempPassword: 'StuSTU20250001@4823', student: { id: 'cuid', fullName: 'Md. Hasan' } } } },
  })
  @ApiResponse({ status: 400, description: 'Application not pending' })
  @ApiResponse({ status: 409, description: 'Student already created' })
  approve(@Param('id') id: string, @CurrentUser('id') adminId: string, @Body() opts: any) {
    return this.svc.approve(id, adminId, opts);
  }

  @Put(':id/reject')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Reject admission application', description: 'Sets status to REJECTED with a review note.' })
  @ApiParam({ name: 'id', description: 'Admission CUID' })
  @ApiBody({ schema: { example: { reviewNote: 'Seats are full for the requested class.' } } })
  @ApiResponse({ status: 200, description: 'Application rejected' })
  @ApiResponse({ status: 400, description: 'Application not in PENDING status' })
  reject(@Param('id') id: string, @CurrentUser('id') adminId: string, @Body('reviewNote') note: string) {
    return this.svc.reject(id, adminId, note);
  }
}
