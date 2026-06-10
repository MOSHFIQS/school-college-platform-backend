import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Shift } from '@prisma/client';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Academic Sessions ─────────────────────────────────────────────────────
  getSessions()          { return this.prisma.academicSession.findMany({ orderBy: { year: 'desc' } }); }
  getCurrentSession()    { return this.prisma.academicSession.findFirst({ where: { isCurrent: true } }); }

  async createSession(name: string, year: number, startDate: string, endDate: string) {
    const ex = await this.prisma.academicSession.findUnique({ where: { year } });
    if (ex) throw new BadRequestException(`Session for year ${year} already exists`);
    return this.prisma.academicSession.create({
      data: { name, year, startDate: new Date(startDate), endDate: new Date(endDate) },
    });
  }

  async updateSession(id: string, data: any) {
    await this.findSessionOrFail(id);
    return this.prisma.academicSession.update({ where: { id }, data });
  }

  async activateSession(id: string) {
    await this.findSessionOrFail(id);
    await this.prisma.academicSession.updateMany({ data: { isCurrent: false } });
    return this.prisma.academicSession.update({ where: { id }, data: { isCurrent: true } });
  }

  private async findSessionOrFail(id: string) {
    const s = await this.prisma.academicSession.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Academic session not found');
    return s;
  }

  // ── Classes ───────────────────────────────────────────────────────────────
  getClasses(sessionId?: string) {
    return this.prisma.class.findMany({
      where: sessionId ? { sessionId } : {},
      include: {
        sections: { include: { classTeacher: { select: { fullName: true } }, _count: { select: { studentSessions: true } } } },
        subjects: { include: { teacherSubjects: { include: { teacher: { select: { fullName: true } } } } } },
        session:  { select: { name: true, year: true } },
      },
      orderBy: { level: 'asc' },
    });
  }

  async createClass(name: string, level: number, shift: Shift, sessionId: string) {
    return this.prisma.class.create({
      data: { name, level, shift, sessionId },
      include: { session: true },
    });
  }

  async updateClass(id: string, data: any) {
    return this.prisma.class.update({ where: { id }, data });
  }

  // ── Sections ──────────────────────────────────────────────────────────────
  async createSection(classId: string, name: string, capacity = 40) {
    await this.findClassOrFail(classId);
    return this.prisma.section.create({
      data: { classId, name, capacity },
      include: { class: true },
    });
  }

  async updateSection(id: string, data: any) {
    return this.prisma.section.update({ where: { id }, data });
  }

  async assignClassTeacher(sectionId: string, teacherId: string) {
    // Verify teacher exists
    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return this.prisma.section.update({ where: { id: sectionId }, data: { classTeacherId: teacherId } });
  }

  // ── Subjects ──────────────────────────────────────────────────────────────
  getSubjectsByClass(classId: string) {
    return this.prisma.subject.findMany({
      where: { classId },
      include: { teacherSubjects: { include: { teacher: { select: { fullName: true, employeeId: true } } } } },
      orderBy: { name: 'asc' },
    });
  }

  async createSubject(name: string, code: string, classId: string) {
    await this.findClassOrFail(classId);
    return this.prisma.subject.create({ data: { name, code, classId } });
  }

  async updateSubject(id: string, data: any) {
    return this.prisma.subject.update({ where: { id }, data });
  }

  private async findClassOrFail(id: string) {
    const c = await this.prisma.class.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Class not found');
    return c;
  }
}
