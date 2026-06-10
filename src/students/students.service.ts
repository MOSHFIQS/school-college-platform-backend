import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────
  findAll(sessionId?: string, classId?: string, sectionId?: string, search?: string, page = 1, limit = 20) {
    const skip  = (page - 1) * limit;
    const where: any = {
      isActive: true,
      ...(search && { OR: [
        { fullName:  { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
        { fatherName:{ contains: search, mode: 'insensitive' } },
      ]}),
      ...(sessionId || classId || sectionId ? {
        sessions: { some: {
          ...(sessionId && { sessionId }),
          ...(classId   && { classId }),
          ...(sectionId && { sectionId }),
        }},
      } : {}),
    };
    return this.prisma.student.findMany({
      where, skip, take: limit,
      include: {
        user:     { select: { email: true, phone: true, isActive: true } },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            session: { select: { name: true, year: true } },
            section: { include: { class: { select: { name: true } } } },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user:             { select: { email: true, phone: true, isActive: true, lastLoginAt: true, mustChangePassword: true } },
        sessions:         { include: { session: true, section: { include: { class: true } } }, orderBy: { createdAt: 'desc' } },
        attendances:      { take: 5, orderBy: { date: 'desc' } },
        leaveApplications:{ take: 5, orderBy: { createdAt: 'desc' } },
        admission:        true,
      },
    });
    if (!s) throw new NotFoundException('Student not found');
    return s;
  }

  async findByStudentId(studentId: string) {
    const s = await this.prisma.student.findUnique({
      where: { studentId },
      include: { user: { select: { email: true, phone: true } }, sessions: { include: { session: true, section: { include: { class: true } } }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!s) throw new NotFoundException(`Student ${studentId} not found`);
    return s;
  }

  async update(id: string, data: any, photoFile?: Express.Multer.File) {
    const student = await this.findOne(id);

    // Handle photo upload
    if (photoFile) {
      // Delete old photo from Cloudinary if it exists
      if (student.photoUrl) {
        const oldPublicId = this.cloudinary.extractPublicId(student.photoUrl);
        if (oldPublicId) await this.cloudinary.deleteFile(oldPublicId);
      }
      const result = await this.cloudinary.uploadFile(photoFile, 'school-portal/students');
      data.photoUrl = result.url;
    }

    return this.prisma.student.update({ where: { id }, data });
  }

  async toggleActive(id: string, isActive: boolean) {
    const s = await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.student.update({ where: { id }, data: { isActive } }),
      this.prisma.user.update({ where: { id: s.userId }, data: { isActive } }),
    ]);
    return { message: `Student ${isActive ? 'activated' : 'deactivated'}` };
  }

  async resetPassword(id: string) {
    const s = await this.findOne(id);
    const tempPass = `Stu${s.studentId.replace(/\W/g, '')}@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashed   = await bcrypt.hash(tempPass, 12);
    await this.prisma.user.update({
      where: { id: s.userId },
      data:  { password: hashed, mustChangePassword: true },
    });
    return { tempPassword: tempPass };
  }

  // ── Session / Promotion ───────────────────────────────────────────────────
  async enroll(studentId: string, sessionId: string, classId: string, sectionId: string, rollNumber: string) {
    const exists = await this.prisma.studentSession.findUnique({
      where: { studentId_sessionId: { studentId, sessionId } },
    });
    if (exists) throw new BadRequestException('Student already enrolled in this session');
    return this.prisma.studentSession.create({
      data: { studentId, sessionId, classId, sectionId, rollNumber, admissionDate: new Date() },
    });
  }

  async promote(studentId: string, newSessionId: string, newClassId: string, newSectionId: string, newRollNumber: string) {
    const current = await this.prisma.studentSession.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    if (!current) throw new NotFoundException('No existing enrollment found');

    await this.prisma.$transaction([
      this.prisma.studentSession.update({
        where: { id: current.id },
        data:  { isPromoted: true, promotedAt: new Date() },
      }),
      this.prisma.studentSession.create({
        data: { studentId, sessionId: newSessionId, classId: newClassId, sectionId: newSectionId, rollNumber: newRollNumber, admissionDate: new Date() },
      }),
    ]);
    return { message: 'Student promoted to new session' };
  }

  async getCurrentEnrollment(studentId: string) {
    return this.prisma.studentSession.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: { session: true, section: { include: { class: true } } },
    });
  }
}
