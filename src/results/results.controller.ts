import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MarkStatus } from '@prisma/client';

@ApiTags('results')
@Controller('results')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class ResultsController {
  constructor(private readonly svc: ResultsService) {}

  // ── Public result search ───────────────────────────────────────────────────
  @Public()
  @Get('search')
  @ApiOperation({
    summary: 'Public result search (no auth required)',
    description:
      '## Public Result Lookup\n\n' +
      'Search by **roll number** (current session) + **exam ID**.\n\n' +
      'Only `PUBLISHED` results are returned. Powers the public result page on the school website.',
  })
  @ApiQuery({ name: 'roll',   required: true, example: '2025601', description: 'Student roll number (current session)' })
  @ApiQuery({ name: 'examId', required: true, example: 'exam_cuid' })
  @ApiResponse({
    status: 200, description: 'Result card with GPA and grade breakdown',
    schema: {
      example: {
        data: {
          student: { fullName: 'Fatema Begum', rollNumber: '2025601', class: 'Class 6', section: 'A' },
          subjects: [{ subject: 'Mathematics', marks: 87, fullMarks: 100, grade: 'A+', gradePoint: 5 }],
          summary: { gpa: 4.8, isPassed: true, totalMarks: 480, totalFullMarks: 600, percentage: 80 },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Results not published yet' })
  @ApiResponse({ status: 404, description: 'Roll number not found in current session' })
  searchPublic(@Query('roll') roll: string, @Query('examId') examId: string) {
    return this.svc.searchPublic(roll, examId);
  }

  // ── Grade scale reference ───────────────────────────────────────────────────
  @Public()
  @Get('grade-scale')
  @ApiOperation({ summary: 'Bangladesh JSC/SSC/HSC grade scale', description: 'Returns the official Bangladesh grading scale (A+ = 5.00 ... F = 0.00). No auth required.' })
  @ApiResponse({ status: 200, schema: { example: { data: [{ range: '80–100', grade: 'A+', gpa: '5.00', remark: 'Outstanding' }] } } })
  getGradeScale() { return this.svc.getGradeScale(); }

  // ── Teacher: Enter marks (DRAFT) ───────────────────────────────────────────
  @Post('marks')
  @Roles('TEACHER')
  @ApiOperation({
    summary: 'Enter marks — DRAFT (teacher)',
    description:
      '## Mark Entry — Step 1\n\n' +
      'Teacher saves marks as **DRAFT**. Can be updated any number of times.\n\n' +
      'Validation:\n' +
      '- Teacher must be assigned to the subject via `TeacherSubject`\n' +
      '- `marksObtained` must be 0 – `fullMarks`\n\n' +
      'After entering all students, call `POST /results/marks/submit` to send for admin review.',
  })
  @ApiBody({
    schema: {
      example: {
        entries: [
          { studentId: 'student_cuid_1', examId: 'exam_cuid', subjectId: 'subject_cuid', marksObtained: 87, fullMarks: 100 },
          { studentId: 'student_cuid_2', examId: 'exam_cuid', subjectId: 'subject_cuid', marksObtained: 54, fullMarks: 100 },
        ],
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Marks saved as DRAFT. Grade/GPA computed automatically.' })
  @ApiResponse({ status: 400, description: 'Marks out of range' })
  @ApiResponse({ status: 403, description: 'Not assigned to one or more subjects' })
  enterMarks(@CurrentUser('id') teacherId: string, @Body('entries') entries: any[]) {
    return this.svc.enterMarks(teacherId, entries);
  }

  // ── Teacher: Submit marks for admin review ─────────────────────────────────
  @Post('marks/submit')
  @Roles('TEACHER')
  @ApiOperation({
    summary: 'Submit marks for admin review — SUBMITTED (teacher)',
    description:
      '## Mark Entry — Step 2\n\n' +
      'Changes all DRAFT entries for this exam+subject to **SUBMITTED**.\n\n' +
      'Admin can then review and publish. Teacher cannot modify after submission without admin reverting.',
  })
  @ApiBody({ schema: { example: { examId: 'exam_cuid', subjectId: 'subject_cuid' } } })
  @ApiResponse({ status: 200, description: 'Marks submitted for admin review' })
  @ApiResponse({ status: 404, description: 'No draft marks found' })
  submitMarks(@CurrentUser('id') teacherId: string, @Body() body: { examId: string; subjectId: string }) {
    return this.svc.submitMarks(teacherId, body.examId, body.subjectId);
  }

  // ── Admin: Publish marks ───────────────────────────────────────────────────
  @Put('marks/publish')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Publish marks → visible to students (admin)',
    description:
      '## Mark Entry — Step 3 (Final)\n\n' +
      'Changes SUBMITTED entries to **PUBLISHED**. Students can now see their results.\n\n' +
      'Optionally filter by `subjectId` to publish one subject at a time.\n\n' +
      'Also marks the `Exam` as `isPublished = true`.',
  })
  @ApiBody({ schema: { example: { examId: 'exam_cuid', subjectId: 'subject_cuid (optional)' } } })
  @ApiResponse({ status: 200, description: 'Results published to students' })
  @ApiResponse({ status: 404, description: 'No submitted entries found' })
  publishMarks(@Body() body: { examId: string; subjectId?: string }) {
    return this.svc.publishMarks(body.examId, body.subjectId);
  }

  // ── Student: Own results ───────────────────────────────────────────────────
  @Get('my-results')
  @Roles('STUDENT')
  @ApiOperation({
    summary: 'My published results (student)',
    description: 'Returns all published results for the logged-in student, grouped by exam with GPA summary.',
  })
  @ApiResponse({ status: 200, description: 'Results grouped by exam' })
  async myResults(@CurrentUser('id') userId: string) {
    const student = await this.svc['prisma'].student.findUnique({ where: { userId } });
    if (!student) return [];
    return this.svc.getStudentResults(student.id);
  }

  // ── Student/Admin: Results for a student ──────────────────────────────────
  @Get('student/:studentId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT')
  @ApiOperation({ summary: 'Get published results for a student' })
  @ApiParam({ name: 'studentId', description: 'Student CUID' })
  @ApiResponse({ status: 200, description: 'Published results grouped by exam with GPA' })
  getStudentResults(@Param('studentId') studentId: string) {
    return this.svc.getStudentResults(studentId);
  }

  // ── Admin: All entries for an exam ────────────────────────────────────────
  @Get('exam/:examId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'View all result entries for an exam (admin)',
    description: 'Returns all entries (DRAFT, SUBMITTED, or PUBLISHED) for an exam. Filter by status or subject.',
  })
  @ApiParam({ name: 'examId', description: 'Exam CUID' })
  @ApiQuery({ name: 'status',    required: false, enum: MarkStatus })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiResponse({ status: 200, description: 'Result entries with student and teacher info' })
  getExamResults(
    @Param('examId')    examId:     string,
    @Query('status')    status?:    MarkStatus,
    @Query('subjectId') subjectId?: string,
  ) { return this.svc.getExamResults(examId, status, subjectId); }
}
