import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { PrismaModule }        from './prisma/prisma.module';
import { CloudinaryModule }    from './cloudinary/cloudinary.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdmissionsModule } from './admissions/admissions.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ClassesModule } from './classes/classes.module';
import { ContactModule } from './contact/contact.module';
import { EventsModule } from './events/events.module';
import { LeaveModule } from './leave/leave.module';
import { NoticesModule } from './notices/notices.module';
import { InstitutionModule } from './institution/institution.module';
import { GalleryModule } from './gallery/gallery.module';
import { ResultsModule } from './results/results.module';
import { RoutineModule } from './routine/routine.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    CloudinaryModule,
    AuthModule,
    UsersModule,
    AdmissionsModule,
    AuditModule,
    NotificationsModule,
    AttendanceModule,
    ClassesModule,
    ContactModule,
    EventsModule,
    GalleryModule,
    InstitutionModule,
    LeaveModule,
    NoticesModule,
    ResultsModule,
    RoutineModule,
    StudentsModule,
    TeachersModule
  ],
})
export class AppModule {}
