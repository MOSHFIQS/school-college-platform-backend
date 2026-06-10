import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  send(data: any) {
    return this.prisma.contactMessage.create({
      data: { name: data.name, email: data.email, phone: data.phone, subject: data.subject, message: data.message },
    });
  }

  findAll(isRead?: boolean, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.prisma.contactMessage.findMany({
      where: { ...(isRead !== undefined && { isRead }) },
      skip, take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(id: string) {
    const m = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Message not found');
    return this.prisma.contactMessage.update({ where: { id }, data: { isRead: true, repliedAt: new Date() } });
  }
}
