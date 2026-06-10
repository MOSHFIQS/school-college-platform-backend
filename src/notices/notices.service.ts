import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NoticeCategory } from '@prisma/client';

@Injectable()
export class NoticesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  findAll(category?: NoticeCategory, search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const now = new Date();
    return this.prisma.notice.findMany({
      where: {
        isPublic: true,
        ...(category && { category }),
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(search && { OR: [{ title: { contains: search, mode: 'insensitive' } }, { body: { contains: search, mode: 'insensitive' } }] }),
      },
      skip, take: limit,
      include: { publishedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const n = await this.prisma.notice.findUnique({ where: { id }, include: { publishedBy: { select: { fullName: true, designation: true } } } });
    if (!n) throw new NotFoundException('Notice not found');
    return n;
  }

  async create(data: any, teacherId: string, attachmentFile?: Express.Multer.File) {
    const teacher = await this.prisma.teacher.findFirst({ where: { userId: teacherId } });
    
    let attachmentUrl = data.attachmentUrl || null;
    if (attachmentFile) {
      const result = await this.cloudinary.uploadFile(attachmentFile, 'school-portal/notices');
      attachmentUrl = result.url;
    }

    return this.prisma.notice.create({
      data: {
        title: data.title,
        body: data.body,
        category: data.category || 'GENERAL',
        attachmentUrl,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        isPublic: data.isPublic !== false && data.isPublic !== 'false',
        publishedById: teacher?.id,
      },
    });
  }

  async update(id: string, data: any, userId: string, isAdmin: boolean, attachmentFile?: Express.Multer.File) {
    const n = await this.findOne(id);
    const teacher = await this.prisma.teacher.findFirst({ where: { userId } });
    if (!isAdmin && n.publishedById !== teacher?.id) throw new ForbiddenException('Cannot edit another teacher\'s notice');

    // Parse expiresAt and isPublic if they are strings from multipart/form-data
    if (data.expiresAt) {
      data.expiresAt = new Date(data.expiresAt);
    }
    if (data.isPublic !== undefined) {
      data.isPublic = data.isPublic !== false && data.isPublic !== 'false';
    }

    if (attachmentFile) {
      if (n.attachmentUrl) {
        const oldId = this.cloudinary.extractPublicId(n.attachmentUrl);
        if (oldId) await this.cloudinary.deleteFile(oldId);
      }
      const result = await this.cloudinary.uploadFile(attachmentFile, 'school-portal/notices');
      data.attachmentUrl = result.url;
    }

    return this.prisma.notice.update({ where: { id }, data });
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const n = await this.findOne(id);
    const teacher = await this.prisma.teacher.findFirst({ where: { userId } });
    if (!isAdmin && n.publishedById !== teacher?.id) throw new ForbiddenException('Cannot delete another teacher\'s notice');

    if (n.attachmentUrl) {
      const publicId = this.cloudinary.extractPublicId(n.attachmentUrl);
      if (publicId) await this.cloudinary.deleteFile(publicId);
    }

    await this.prisma.notice.delete({ where: { id } });
    return { message: 'Notice deleted' };
  }

  adminFindAll(category?: NoticeCategory) {
    return this.prisma.notice.findMany({
      where: category ? { category } : {},
      include: { publishedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
