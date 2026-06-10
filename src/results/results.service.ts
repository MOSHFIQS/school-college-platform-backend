import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateGrade, calculateGPA } from '../common/utils/gpa.util';
import { MarkStatus } from '@prisma/client';

@Injectable()
export class ResultsService {
  private readonly logger = new Logger(ResultsService.name);
  constructor(private readonly prisma: PrismaService) {}

  // ── Teacher: Enter / update marks (DRAFT) ────────────────────────────────
  async enterMarks(teacherId: string, entries: Array<{ studentId: string; examId: string; subjectId: string; marksObtained: number; fullMarks?: number }>) {
    // Verify teacher is assigned to the subject(s)
    const subjectIds = [...new Set(entries.map(e => e.subjectId))];
    const assigned = await this.prisma.teacherSubject.findMany({
      where: { teacherId, subjectId: { in: subjectIds } },
    });
    if (assigned.length !== subjectIds.length) {
      throw new ForbiddenException('You are not assigned to one or more of these subjects');
    }

    // Validate marks
    for (const e of entries) {
      const full = e.fullMarks ?? 100;
      if (e.marksObtained < 0 || e.marksObtained > full) {
        throw new BadRequestException(`Marks for student ${e.studentId} must be 0–${full}`);
      }
    }

    const upserts = entries.map(e => {
      const full = e.fullMarks ?? 100;
      const { grade, gradePoint, isPassed } = calculateGrade(e.marksObtained, full);
      return this.prisma.result.upsert({
        where: { studentId_examId_subjectId: { studentId: e.studentId, examId: e.examId, subjectId: e.subjectId } },
        update: { marksObtained: e.marksObtained, fullMarks: full, grade, gradePoint, isPassed, status: MarkStatus.DRAFT },
        create: {
          studentId: e.studentId, examId: e.examId, subjectId: e.subjectId,
          teacherId, marksObtained: e.marksObtained, fullMarks: full,
          grade, gradePoint, isPassed, status: MarkStatus.DRAFT,
        },
      });
    });

    await this.prisma.$transaction(upserts);
    return { message: `Marks saved as DRAFT for ${entries.length} entries` };
  }

  // ── Teacher: Submit marks for admin review ────────────────────────────────
  async submitMarks(teacherId: string, examId: string, subjectId: string) {
    const draftCount = await this.prisma.result.count({
      where: { teacherId, examId, subjectId, status: MarkStatus.DRAFT },
    });
    if (!draftCount) throw new NotFoundException('No draft marks found for this exam/subject');

    await this.prisma.result.updateMany({
      where: { teacherId, examId, subjectId, status: MarkStatus.DRAFT },
      data:  { status: MarkStatus.SUBMITTED },
    });
    return { message: `${draftCount} entries submitted for admin review` };
  }

  // ── Admin: Publish marks ──────────────────────────────────────────────────
  async publishMarks(examId: string, subjectId?: string) {
    const where: any = { examId, status: MarkStatus.SUBMITTED, ...(subjectId && { subjectId }) };
    const count = await this.prisma.result.count({ where });
    if (!count) throw new NotFoundException('No submitted entries found to publish');

    await this.prisma.result.updateMany({
      where,
      data: { status: MarkStatus.PUBLISHED, publishedAt: new Date() },
    });

    // Publish the exam too if all subjects are published
    await this.prisma.exam.update({
      where: { id: examId },
      data:  { isPublished: true, publishedAt: new Date() },
    });

    return { message: `${count} results published` };
  }

  // ── Public result search (by roll + examId) ───────────────────────────────
  async searchPublic(rollNumber: string, examId: string) {
    // Find current session enrollment with this roll number
    const enrollment = await this.prisma.studentSession.findFirst({
      where: { rollNumber, session: { isCurrent: true } },
      include: { student: true, session: true, section: { include: { class: true } } },
    });
    if (!enrollment) throw new NotFoundException('Student not found with this roll number in current session');

    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam?.isPublished) throw new ForbiddenException('Results have not been published yet');

    return this.buildResult(enrollment.studentId, examId, enrollment);
  }

  // ── Student: View own published results ───────────────────────────────────
  async getStudentResults(studentId: string) {
    const results = await this.prisma.result.findMany({
      where:   { studentId, status: MarkStatus.PUBLISHED },
      include: { exam: true, subject: true },
      orderBy: [{ exam: { startDate: 'desc' } }],
    });

    // Group by exam
    const grouped = results.reduce((acc, r) => {
      if (!acc[r.examId]) acc[r.examId] = { exam: r.exam, subjects: [] };
      acc[r.examId].subjects.push(r);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).map((g: any) => {
      const gpa = calculateGPA(g.subjects.map((s: any) => ({ grade: s.grade, gradePoint: s.gradePoint, isPassed: s.isPassed })));
      const passed = g.subjects.every((s: any) => s.isPassed);
      const totalMarks = g.subjects.reduce((s: number, r: any) => s + r.marksObtained, 0);
      const totalFull  = g.subjects.reduce((s: number, r: any) => s + r.fullMarks, 0);
      return { ...g, gpa, isPassed: passed, totalMarks, totalFullMarks: totalFull, percentage: Math.round((totalMarks / totalFull) * 100) };
    });
  }

  // ── Admin: View all results (including drafts) ────────────────────────────
  async getExamResults(examId: string, status?: MarkStatus, subjectId?: string) {
    return this.prisma.result.findMany({
      where: { examId, ...(status && { status }), ...(subjectId && { subjectId }) },
      include: { student: { select: { fullName: true, studentId: true } }, subject: true, teacher: { select: { fullName: true } } },
      orderBy: [{ subject: { name: 'asc' } }, { student: { fullName: 'asc' } }],
    });
  }

  // ── Grade scale reference ────────────────────────────────────────────────
  getGradeScale() {
    const { BD_GRADE_SCALE } = require('../common/utils/gpa.util');
    return BD_GRADE_SCALE;
  }

  private async buildResult(studentId: string, examId: string, enrollment: any) {
    const results = await this.prisma.result.findMany({
      where: { studentId, examId, status: MarkStatus.PUBLISHED },
      include: { subject: true },
    });
    const gpa    = calculateGPA(results.map(r => ({ grade: r.grade!, gradePoint: r.gradePoint!, isPassed: r.isPassed! })));
    const passed = results.every(r => r.isPassed);
    const totalMarks = results.reduce((s, r) => s + r.marksObtained, 0);
    const totalFull  = results.reduce((s, r) => s + r.fullMarks, 0);
    return {
      student: { fullName: enrollment.student.fullName, rollNumber: enrollment.rollNumber, class: enrollment.section.class.name, section: enrollment.section.name },
      exam: await this.prisma.exam.findUnique({ where: { id: examId } }),
      subjects: results.map(r => ({ subject: r.subject.name, code: r.subject.code, marks: r.marksObtained, fullMarks: r.fullMarks, grade: r.grade, gradePoint: r.gradePoint, isPassed: r.isPassed })),
      summary: { gpa, isPassed: passed, totalMarks, totalFullMarks: totalFull, percentage: Math.round((totalMarks / totalFull) * 100) },
    };
  }
}
