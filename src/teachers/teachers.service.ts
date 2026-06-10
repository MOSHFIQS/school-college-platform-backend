import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ── Create teacher + user account ─────────────────────────────────────────
  async create(data: any, createdById: string, photoFile?: Express.Multer.File) {
    const ex = await this.prisma.teacher.findUnique({ where: { employeeId: data.employeeId } });
    if (ex) throw new ConflictException(`Employee ID ${data.employeeId} already exists`);

    // Upload photo if provided
    let photoUrl: string | undefined;
    if (photoFile) {
      const result = await this.cloudinary.uploadFile(photoFile, 'school-portal/teachers');
      photoUrl = result.url;
    }

    const tempPassword  = this.generateTempPassword(data.employeeId);
    const hashedPass    = await bcrypt.hash(tempPassword, 12);

    const teacher = await this.prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email:               data.email?.toLowerCase(),
          phone:               data.phone,
          password:            hashedPass,
          role:                'TEACHER',
          mustChangePassword:  true,
          createdById,
        },
      });
      return tx.teacher.create({
        data: {
          userId:        user.id,
          employeeId:    data.employeeId,
          fullName:      data.fullName,
          fullNameBn:    data.fullNameBn,
          designation:   data.designation,
          qualification: data.qualification,
          gender:        data.gender,
          joiningDate:   new Date(data.joiningDate),
          dateOfBirth:   data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          phone:         data.phone,
          photoUrl,
        },
        include: { user: { select: { email: true, phone: true } } },
      });
    });

    return { teacher, tempPassword }; // show once — admin notes it
  }

  // ── List ──────────────────────────────────────────────────────────────────
  findAll(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {
      isActive: true,
      ...(search && { OR: [
        { fullName:   { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ]}),
    };
    return this.prisma.teacher.findMany({
      where, skip, take: limit,
      include: {
        user: { select: { email: true, phone: true, isActive: true } },
        classSection: { select: { name: true, class: { select: { name: true } } } },
        teacherSubjects: { include: { subject: { include: { class: { select: { name: true } } } } } },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, phone: true, isActive: true, lastLoginAt: true } },
        classSection:    { include: { class: true } },
        teacherClasses:  { include: { class: true } },
        teacherSections: { include: { section: { include: { class: true } } } },
        teacherSubjects: { include: { subject: { include: { class: true } } } },
      },
    });
    if (!t) throw new NotFoundException('Teacher not found');
    return t;
  }

  async update(id: string, data: any, photoFile?: Express.Multer.File) {
    const teacher = await this.findOne(id);

    // Handle photo upload
    if (photoFile) {
      // Delete old photo from Cloudinary if it exists
      if (teacher.photoUrl) {
        const oldPublicId = this.cloudinary.extractPublicId(teacher.photoUrl);
        if (oldPublicId) await this.cloudinary.deleteFile(oldPublicId);
      }
      const result = await this.cloudinary.uploadFile(photoFile, 'school-portal/teachers');
      data.photoUrl = result.url;
    }

    return this.prisma.teacher.update({ where: { id }, data });
  }

  async toggleActive(id: string, isActive: boolean) {
    const t = await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.teacher.update({ where: { id }, data: { isActive } }),
      this.prisma.user.update({ where: { id: t.userId }, data: { isActive } }),
    ]);
    return { message: `Teacher ${isActive ? 'activated' : 'deactivated'}` };
  }

  // ── Reset teacher password (admin) ────────────────────────────────────────
  async resetPassword(id: string) {
    const t = await this.findOne(id);
    const tempPassword = this.generateTempPassword(t.employeeId);
    const hashed = await bcrypt.hash(tempPassword, 12);
    await this.prisma.user.update({
      where: { id: t.userId },
      data:  { password: hashed, mustChangePassword: true },
    });
    return { tempPassword }; // admin gives this to teacher
  }

  // ── Assign teacher to classes, sections, subjects ─────────────────────────
  async assignClasses(teacherId: string, classIds: string[]) {
    await this.findOne(teacherId);
    await this.prisma.teacherClass.deleteMany({ where: { teacherId } });
    await this.prisma.teacherClass.createMany({
      data: classIds.map(classId => ({ teacherId, classId })),
      skipDuplicates: true,
    });
    return { message: 'Classes assigned' };
  }

  async assignSections(teacherId: string, sectionIds: string[]) {
    await this.findOne(teacherId);
    await this.prisma.teacherSection.deleteMany({ where: { teacherId } });
    await this.prisma.teacherSection.createMany({
      data: sectionIds.map(sectionId => ({ teacherId, sectionId })),
      skipDuplicates: true,
    });
    return { message: 'Sections assigned' };
  }

  async assignSubjects(teacherId: string, subjectIds: string[]) {
    await this.findOne(teacherId);
    await this.prisma.teacherSubject.deleteMany({ where: { teacherId } });
    await this.prisma.teacherSubject.createMany({
      data: subjectIds.map(subjectId => ({ teacherId, subjectId })),
      skipDuplicates: true,
    });
    return { message: 'Subjects assigned' };
  }

  // ── Public directory ──────────────────────────────────────────────────────
  getPublicDirectory() {
    return this.prisma.teacher.findMany({
      where: { isActive: true },
      select: {
        id: true, fullName: true, fullNameBn: true,
        designation: true, qualification: true, photoUrl: true, gender: true,
        teacherSubjects: { include: { subject: { select: { name: true, class: { select: { name: true } } } } } },
      },
      orderBy: { designation: 'asc' },
    });
  }

  private generateTempPassword(seed: string): string {
    return `T${seed.replace(/\W/g, '')}@${Math.floor(1000 + Math.random() * 9000)}`;
  }
}
