import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CertificateStatus } from '@prisma/client';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(adminId: string, data: any) {
    return this.prisma.certificate.create({
      data: { studentId: data.studentId, type: data.type, title: data.title, body: data.body, createdBy: adminId, status: CertificateStatus.DRAFT },
    });
  }

  findAll(studentId?: string, status?: CertificateStatus) {
    return this.prisma.certificate.findMany({
      where: { ...(studentId && { studentId }), ...(status && { status }) },
      include: { student: { select: { fullName: true, studentId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.certificate.findUnique({ where: { id }, include: { student: true } });
    if (!c) throw new NotFoundException('Certificate not found');
    return c;
  }

  /** Student: view own PUBLISHED certificates only */
  async studentView(studentId: string) {
    return this.prisma.certificate.findMany({
      where: { studentId, status: CertificateStatus.PUBLISHED },
      orderBy: { issuedDate: 'desc' },
    });
  }

  async approve(id: string, adminId: string) {
    await this.findOne(id);
    return this.prisma.certificate.update({
      where: { id },
      data: { status: CertificateStatus.APPROVED, approvedBy: adminId, approvedAt: new Date() },
    });
  }

  async publish(id: string) {
    const c = await this.findOne(id);
    if (c.status !== 'APPROVED') throw new ForbiddenException('Certificate must be approved before publishing');
    return this.prisma.certificate.update({
      where: { id },
      data: { status: CertificateStatus.PUBLISHED, issuedDate: new Date() },
    });
  }

  async revoke(id: string, revokeNote: string) {
    await this.findOne(id);
    return this.prisma.certificate.update({
      where: { id },
      data: { status: CertificateStatus.REVOKED, revokedAt: new Date(), revokeNote },
    });
  }
}
