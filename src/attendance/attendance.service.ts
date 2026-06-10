import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
  constructor(private readonly prisma: PrismaService) {}

  // ── Take attendance (teacher) ─────────────────────────────────────────────
  async take(teacherId: string, sectionId: string, date: string, entries: Array<{ studentId: string; status: AttendanceStatus; note?: string }>) {
    const attendanceDate = new Date(date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - attendanceDate.getTime()) / 86_400_000);

    if (diffDays > 2) throw new ForbiddenException('Cannot modify attendance older than 2 days');

    const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');

    // Verify teacher is assigned to this section
    const assigned = await this.prisma.teacherSection.findFirst({ where: { teacherId, sectionId } });
    if (!assigned) throw new ForbiddenException('You are not assigned to this section');

    await this.prisma.$transaction(
      entries.map(e =>
        this.prisma.attendance.upsert({
          where: { studentId_date: { studentId: e.studentId, date: attendanceDate } },
          update: { status: e.status, note: e.note, takenById: teacherId },
          create: { studentId: e.studentId, sectionId, date: attendanceDate, status: e.status, note: e.note, takenById: teacherId },
        }),
      ),
    );

    return {
      message:  `Attendance recorded for ${entries.length} students`,
      present:  entries.filter(e => e.status === 'PRESENT').length,
      absent:   entries.filter(e => e.status === 'ABSENT').length,
      late:     entries.filter(e => e.status === 'LATE').length,
      holiday:  entries.filter(e => e.status === 'HOLIDAY').length,
    };
  }

  // ── Get section attendance for a date ─────────────────────────────────────
  async getSectionAttendance(sectionId: string, date: string) {
    const students = await this.prisma.student.findMany({
      where: { sessions: { some: { sectionId } }, isActive: true },
      orderBy: { fullName: 'asc' },
    });

    const records = await this.prisma.attendance.findMany({
      where: { sectionId, date: new Date(date) },
    });

    const map = records.reduce((acc, r) => { acc[r.studentId] = r; return acc; }, {} as Record<string, any>);

    return students.map(s => ({
      studentId: s.id, fullName: s.fullName,
      attendance: map[s.id] ?? null,
      status: map[s.id]?.status ?? 'NOT_TAKEN',
    }));
  }

  // ── Monthly report ────────────────────────────────────────────────────────
  async getMonthlyReport(sectionId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0);

    const students = await this.prisma.student.findMany({
      where: { sessions: { some: { sectionId } }, isActive: true },
      orderBy: { fullName: 'asc' },
    });

    const records = await this.prisma.attendance.findMany({
      where: { sectionId, date: { gte: start, lte: end } },
    });

    return students.map(s => {
      const recs    = records.filter(r => r.studentId === s.id);
      const present = recs.filter(r => r.status === 'PRESENT').length;
      const absent  = recs.filter(r => r.status === 'ABSENT').length;
      const late    = recs.filter(r => r.status === 'LATE').length;
      const total   = present + absent + late;
      return {
        studentId: s.id, fullName: s.fullName,
        present, absent, late, total,
        percentage:       total ? Math.round(((present + late) / total) * 100) : 0,
        isLowAttendance:  total ? ((present + late) / total) < 0.75 : false,
      };
    });
  }

  // ── Student attendance calendar ────────────────────────────────────────────
  async getStudentCalendar(studentId: string, year: number, month: number) {
    const records = await this.prisma.attendance.findMany({
      where: { studentId, date: { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0) } },
      orderBy: { date: 'asc' },
    });

    const calendar: Record<number, string> = {};
    records.forEach(r => { calendar[new Date(r.date).getDate()] = r.status; });

    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent  = records.filter(r => r.status === 'ABSENT').length;
    const late    = records.filter(r => r.status === 'LATE').length;
    const total   = present + absent + late;

    return { year, month, calendar, summary: { present, absent, late, total, percentage: total ? Math.round(((present + late) / total) * 100) : 0 } };
  }

  // ── Admin override ─────────────────────────────────────────────────────────
  async adminOverride(adminId: string, studentId: string, date: string, status: AttendanceStatus, note?: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, include: { sessions: { take: 1, orderBy: { createdAt: 'desc' } } } });
    if (!student) throw new NotFoundException('Student not found');

    const sectionId = student.sessions[0]?.sectionId;
    if (!sectionId) throw new NotFoundException('No active enrollment found for student');

    return this.prisma.attendance.upsert({
      where: { studentId_date: { studentId, date: new Date(date) } },
      update: { status, note, takenById: adminId },
      create: { studentId, sectionId, date: new Date(date), status, note, takenById: adminId },
    });
  }

  // ── Cron: SMS alert for 3+ consecutive absences ───────────────────────────
  @Cron(CronExpression.EVERY_DAY_AT_8PM)
  async sendAbsenceAlerts() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const recentAbsences = await this.prisma.attendance.groupBy({
      by: ['studentId'],
      where: { status: 'ABSENT', date: { gte: threeDaysAgo } },
      _count: { _all: true },
    });

    const repeated = recentAbsences.filter(r => r._count._all >= 3);
    if (!repeated.length) return;

    const students = await this.prisma.student.findMany({
      where: { id: { in: repeated.map(r => r.studentId) } },
      select: { fullName: true, fullNameBn: true, guardianPhone: true, fatherPhone: true },
    });

    this.logger.log(`Absence alert: ${students.length} students with 3+ consecutive absences`);
    // In production: integrate SSL Wireless SMS here
  }
}
