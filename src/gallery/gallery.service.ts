import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class GalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  getAlbums() {
    return this.prisma.galleryAlbum.findMany({
      include: { _count: { select: { photos: true } }, photos: { take: 1, orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAlbum(id: string) {
    const a = await this.prisma.galleryAlbum.findUnique({ where: { id }, include: { photos: { orderBy: { sortOrder: 'asc' } } } });
    if (!a) throw new NotFoundException('Album not found');
    return a;
  }

  async createAlbum(data: any, userId: string, coverFile?: Express.Multer.File) {
    let coverUrl = data.coverUrl || null;
    if (coverFile) {
      const result = await this.cloudinary.uploadFile(coverFile, 'school-portal/gallery/covers');
      coverUrl = result.url;
    }
    return this.prisma.galleryAlbum.create({
      data: { name: data.name, description: data.description, eventDate: data.eventDate ? new Date(data.eventDate) : undefined, coverUrl, createdBy: userId },
    });
  }

  async addPhotos(albumId: string, files: Express.Multer.File[], captions: string[] = []) {
    if (!files || files.length === 0) {
      throw new NotFoundException('No photos provided');
    }
    const uploaded = await this.cloudinary.uploadFiles(files, 'school-portal/gallery/photos');
    return this.prisma.galleryPhoto.createMany({
      data: uploaded.map((u, i) => ({ albumId, url: u.url, caption: captions[i] || null, sortOrder: i })),
    });
  }

  async deletePhoto(id: string) {
    const photo = await this.prisma.galleryPhoto.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('Photo not found');
    // Delete from Cloudinary
    const publicId = this.cloudinary.extractPublicId(photo.url);
    if (publicId) await this.cloudinary.deleteFile(publicId);
    return this.prisma.galleryPhoto.delete({ where: { id } });
  }

  async deleteAlbum(id: string) {
    const album = await this.prisma.galleryAlbum.findUnique({ where: { id }, include: { photos: true } });
    if (!album) throw new NotFoundException('Album not found');
    // Delete all photos from Cloudinary
    const publicIds = album.photos
      .map(p => this.cloudinary.extractPublicId(p.url))
      .filter((id): id is string => id !== null);
    if (album.coverUrl) {
      const coverId = this.cloudinary.extractPublicId(album.coverUrl);
      if (coverId) publicIds.push(coverId);
    }
    await this.cloudinary.deleteFiles(publicIds);
    return this.prisma.galleryAlbum.delete({ where: { id } });
  }
}
