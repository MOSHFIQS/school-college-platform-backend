import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Super Admin creates Admin accounts */
  async createAdmin(data: any, createdById: string) {
    const ex = await this.prisma.user.findFirst({ where: { OR: [{ email: data.email }, { phone: data.phone }] } });
    if (ex) throw new ConflictException('Email or phone already in use');
    const tempPass = `Admin@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashed = await bcrypt.hash(tempPass, 12);
    const user = await this.prisma.user.create({
      data: { email: data.email?.toLowerCase(), phone: data.phone, password: hashed, role: Role.ADMIN, mustChangePassword: true, createdById },
    });
    return { user: { id: user.id, email: user.email, phone: user.phone, role: user.role }, tempPassword: tempPass };
  }

  findAll(role?: Role, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.prisma.user.findMany({
      where: { ...(role && { role }) },
      skip, take: limit,
      select: { id: true, email: true, phone: true, role: true, isActive: true, mustChangePassword: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, phone: true, role: true, isActive: true, mustChangePassword: true, lastLoginAt: true, createdAt: true, createdById: true },
    });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async toggleActive(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { isActive }, select: { id: true, email: true, isActive: true } });
  }

  async resetPassword(id: string) {
    await this.findOne(id);
    const tempPass = `Reset@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashed = await bcrypt.hash(tempPass, 12);
    await this.prisma.user.update({ where: { id }, data: { password: hashed, mustChangePassword: true } });
    return { tempPassword: tempPass };
  }
}
