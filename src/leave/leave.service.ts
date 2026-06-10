import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveStatus } from '@prisma/client';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(userId: string, role: string, data: any) {
    let studentId: string | undefined;
    let teacherId: string | undefined;
    if (role === 'STUDENT') {
      const s = await this.prisma.student.findUnique({ where: { userId } });
      studentId = s?.id;
    } else if (role === 'TEACHER') {
      const t = await this.prisma.teacher.findFirst({ where: { userId } });
      teacherId = t?.id;
    }
    return this.prisma.leaveApplication.create({
      data: {
        applicantType: role.toLowerCase(),
        studentId, teacherId,
        leaveType: data.leaveType,
        fromDate: new Date(data.fromDate),
        toDate: new Date(data.toDate),
        reason: data.reason,
      },
    });
  }

  findAll(status?: LeaveStatus, applicantType?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.prisma.leaveApplication.findMany({
      where: { ...(status && { status }), ...(applicantType && { applicantType }) },
      skip, take: limit,
      include: {
        student: { select: { fullName: true, studentId: true } },
        teacher: { select: { fullName: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  myApplications(userId: string, role: string) {
    const where: any = role === 'STUDENT'
      ? { student: { userId } }
      : { teacher: { userId } };
    return this.prisma.leaveApplication.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async review(id: string, adminId: string, status: LeaveStatus, reviewNote?: string) {
    const app = await this.prisma.leaveApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Leave application not found');
    if (app.status !== 'PENDING') throw new ForbiddenException('Application already reviewed');
    return this.prisma.leaveApplication.update({
      where: { id },
      data: { status, reviewedBy: adminId, reviewedAt: new Date(), reviewNote },
    });
  }
}
