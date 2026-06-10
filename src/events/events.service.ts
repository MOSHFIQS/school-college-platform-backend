import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  findAll(upcoming?: boolean) {
    return this.prisma.event.findMany({
      where: { isPublic: true, ...(upcoming && { eventDate: { gte: new Date() } }) },
      orderBy: { eventDate: upcoming ? 'asc' : 'desc' },
    });
  }

  async findOne(id: string) {
    const e = await this.prisma.event.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Event not found');
    return e;
  }

  async create(data: any, userId: string, posterFile?: Express.Multer.File) {
    let posterUrl = data.posterUrl || null;
    if (posterFile) {
      const result = await this.cloudinary.uploadFile(posterFile, 'school-portal/events');
      posterUrl = result.url;
    }
    return this.prisma.event.create({
      data: {
        title: data.title, description: data.description,
        eventDate: new Date(data.eventDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        venue: data.venue, posterUrl,
        isPublic: data.isPublic !== false, createdBy: userId,
      },
    });
  }

  async update(id: string, data: any, posterFile?: Express.Multer.File) {
    if (posterFile) {
      const existing = await this.findOne(id);
      if (existing.posterUrl) {
        const oldId = this.cloudinary.extractPublicId(existing.posterUrl);
        if (oldId) await this.cloudinary.deleteFile(oldId);
      }
      const result = await this.cloudinary.uploadFile(posterFile, 'school-portal/events');
      data.posterUrl = result.url;
    }
    return this.prisma.event.update({ where: { id }, data });
  }

  async delete(id: string) {
    const event = await this.findOne(id);
    if (event.posterUrl) {
      const publicId = this.cloudinary.extractPublicId(event.posterUrl);
      if (publicId) await this.cloudinary.deleteFile(publicId);
    }
    return this.prisma.event.delete({ where: { id } });
  }
}
