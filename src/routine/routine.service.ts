import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoutineService {
  constructor(private readonly prisma: PrismaService) {}

  upsert(data: any) {
    return this.prisma.routine.upsert({
      where: { sectionId_dayOfWeek_period: { sectionId: data.sectionId, dayOfWeek: data.dayOfWeek, period: data.period } },
      update: { subjectId: data.subjectId, startTime: data.startTime, endTime: data.endTime, roomNo: data.roomNo },
      create: { sectionId: data.sectionId, subjectId: data.subjectId, dayOfWeek: data.dayOfWeek, period: data.period, startTime: data.startTime, endTime: data.endTime, roomNo: data.roomNo },
      include: { subject: { include: { teacherSubjects: { include: { teacher: { select: { fullName: true } } } } } } },
    });
  }

  async getSectionRoutine(sectionId: string) {
    const entries = await this.prisma.routine.findMany({
      where: { sectionId },
      include: { subject: { include: { teacherSubjects: { include: { teacher: { select: { fullName: true } } } } } } },
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
    });
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];
    return days.map((dayName, i) => ({
      day: i, dayName,
      periods: entries.filter(e => e.dayOfWeek === i),
    }));
  }

  delete(sectionId: string, dayOfWeek: number, period: number) {
    return this.prisma.routine.delete({
      where: { sectionId_dayOfWeek_period: { sectionId, dayOfWeek, period } },
    });
  }
}
