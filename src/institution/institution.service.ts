import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class InstitutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  get() { return this.prisma.institutionSettings.findFirst(); }

  async upsert(data: any, logoFile?: Express.Multer.File, principalPhotoFile?: Express.Multer.File) {
    const existing = await this.prisma.institutionSettings.findFirst();

    // Handle logo upload
    if (logoFile) {
      if (existing?.logoUrl) {
        const oldId = this.cloudinary.extractPublicId(existing.logoUrl);
        if (oldId) await this.cloudinary.deleteFile(oldId);
      }
      const result = await this.cloudinary.uploadFile(logoFile, 'school-portal/institution');
      data.logoUrl = result.url;
    }

    // Handle principal photo upload
    if (principalPhotoFile) {
      if (existing?.principalPhotoUrl) {
        const oldId = this.cloudinary.extractPublicId(existing.principalPhotoUrl);
        if (oldId) await this.cloudinary.deleteFile(oldId);
      }
      const result = await this.cloudinary.uploadFile(principalPhotoFile, 'school-portal/institution');
      data.principalPhotoUrl = result.url;
    }

    // Convert established to number if it's a string (from form-data)
    if (data.established && typeof data.established === 'string') {
      data.established = parseInt(data.established, 10);
    }

    if (existing) return this.prisma.institutionSettings.update({ where: { id: existing.id }, data });
    return this.prisma.institutionSettings.create({ data });
  }
}
