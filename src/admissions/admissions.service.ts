import {
  Injectable, NotFoundException, BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AdmissionStatus } from '@prisma/client';

@Injectable()
export class AdmissionsService {
  private readonly logger = new Logger(AdmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ── Public: Submit application ────────────────────────────────────────────
  async submit(
    data: any,
    photoFile?: Express.Multer.File,
    birthCertFile?: Express.Multer.File,
    testimonialFile?: Express.Multer.File,
  ) {
    // Upload documents to Cloudinary
    let photoUrl = data.photoUrl || null;
    let birthCertUrl = data.birthCertUrl || null;
    let testimonialUrl = data.testimonialUrl || null;

    if (photoFile) {
      const result = await this.cloudinary.uploadFile(photoFile, 'school-portal/admissions/photos');
      photoUrl = result.url;
    }
    if (birthCertFile) {
      const result = await this.cloudinary.uploadFile(birthCertFile, 'school-portal/admissions/documents');
      birthCertUrl = result.url;
    }
    if (testimonialFile) {
      const result = await this.cloudinary.uploadFile(testimonialFile, 'school-portal/admissions/documents');
      testimonialUrl = result.url;
    }

    const no = await this.generateApplicationNo();
    return this.prisma.admission.create({
      data: {
        applicationNo: no,
        sessionId:     data.sessionId,
        classId:       data.classId,
        applicantName:   data.applicantName,
        applicantNameBn: data.applicantNameBn,
        dateOfBirth:     new Date(data.dateOfBirth),
        gender:          data.gender,
        bloodGroup:      data.bloodGroup,
        fatherName:      data.fatherName,
        fatherPhone:     data.fatherPhone,
        motherName:      data.motherName,
        motherPhone:     data.motherPhone,
        guardianPhone:   data.guardianPhone,
        guardianEmail:   data.guardianEmail,
        previousSchool:  data.previousSchool,
        previousClass:   data.previousClass,
        previousGpa:     data.previousGpa,
        photoUrl,
        birthCertUrl,
        testimonialUrl,
        village:  data.village,
        upazila:  data.upazila,
        district: data.district,
        division: data.division,
        status: AdmissionStatus.PENDING,
      },
    });
  }

  // ── Public: Track application ─────────────────────────────────────────────
  async track(applicationNo: string) {
    const a = await this.prisma.admission.findUnique({
      where: { applicationNo },
      select: {
        applicationNo: true, status: true, applicantName: true,
        applicantNameBn: true, reviewNote: true, reviewedAt: true, submittedAt: true,
      },
    });
    if (!a) throw new NotFoundException('Application not found');
    return a;
  }

  // ── Admin: List applications ───────────────────────────────────────────────
  findAll(status?: AdmissionStatus, classId?: string, sessionId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {
      ...(status    && { status }),
      ...(classId   && { classId }),
      ...(sessionId && { sessionId }),
    };
    return this.prisma.admission.findMany({
      where, skip, take: limit,
      include: { class: { select: { name: true } }, session: { select: { name: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const a = await this.prisma.admission.findUnique({
      where: { id },
      include: { class: true, session: true, student: true },
    });
    if (!a) throw new NotFoundException('Admission not found');
    return a;
  }

  // ── Admin: Approve → create Student + User ────────────────────────────────
  async approve(id: string, adminId: string, opts: { sectionId: string; rollNumber: string }) {
    const admission = await this.findOne(id);

    if (admission.status !== 'PENDING') {
      throw new BadRequestException('Application is not in PENDING status');
    }
    if (admission.studentId) {
      throw new ConflictException('Student account already created for this admission');
    }

    // Auto-generate student ID
    const count      = await this.prisma.student.count();
    const studentId  = `STU-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const tempPass   = `Stu${studentId.replace(/\W/g, '')}@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashed     = await bcrypt.hash(tempPass, 12);

    const result = await this.prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          password: hashed, role: 'STUDENT',
          mustChangePassword: true, createdById: adminId,
        },
      });

      const student = await tx.student.create({
        data: {
          userId:      user.id,
          studentId,
          fullName:    admission.applicantName,
          fullNameBn:  admission.applicantNameBn,
          dateOfBirth: admission.dateOfBirth,
          gender:      admission.gender,
          bloodGroup:  admission.bloodGroup,
          fatherName:  admission.fatherName,
          fatherPhone: admission.fatherPhone,
          motherName:  admission.motherName,
          motherPhone: admission.motherPhone,
          guardianPhone: admission.guardianPhone,
          village:  admission.village,
          upazila:  admission.upazila,
          district: admission.district,
          division: admission.division,
          photoUrl: admission.photoUrl,
        },
      });

      // Create enrollment for the session
      await tx.studentSession.create({
        data: {
          studentId:     student.id,
          sessionId:     admission.sessionId,
          classId:       admission.classId,
          sectionId:     opts.sectionId,
          rollNumber:    opts.rollNumber,
          admissionDate: new Date(),
        },
      });

      // Link admission → student
      await tx.admission.update({
        where: { id },
        data: {
          status: AdmissionStatus.APPROVED,
          studentId: student.id,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      return { student, tempPassword: tempPass, studentId };
    });

    this.logger.log(`Admission approved: ${admission.applicationNo} → ${result.studentId}`);
    return result;
  }

  // ── Admin: Reject ─────────────────────────────────────────────────────────
  async reject(id: string, adminId: string, reviewNote: string) {
    const admission = await this.findOne(id);
    if (admission.status !== 'PENDING') {
      throw new BadRequestException('Application is not in PENDING status');
    }
    return this.prisma.admission.update({
      where: { id },
      data: { status: AdmissionStatus.REJECTED, reviewedBy: adminId, reviewedAt: new Date(), reviewNote },
    });
  }

  private async generateApplicationNo(): Promise<string> {
    const count = await this.prisma.admission.count();
    return `ADM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
}
