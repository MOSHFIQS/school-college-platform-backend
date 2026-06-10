import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(userId: string, action: string, entityType: string, entityId?: string, oldData?: any, newData?: any, ipAddress?: string) {
    return this.prisma.auditLog.create({
      data: { userId, action, entityType, entityId, oldData, newData, ipAddress },
    });
  }

  findAll(userId?: string, entityType?: string, action?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return this.prisma.auditLog.findMany({
      where: {
        ...(userId && { userId }),
        ...(entityType && { entityType }),
        ...(action && { action: { contains: action, mode: 'insensitive' } }),
      },
      skip, take: limit,
      include: { user: { select: { email: true, phone: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
