import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { PrismaModule }        from './prisma/prisma.module';
import { AuthModule }          from './auth/auth.module';
import { InstitutionModule }   from './institution/institution.module';
import { UsersModule }         from './users/users.module';
import { ClassesModule }       from './classes/classes.module';
import { TeachersModule }      from './teachers/teachers.module';
import { AdmissionsModule }    from './admissions/admissions.module';
import { StudentsModule }      from './students/students.module';
import { AttendanceModule }    from './attendance/attendance.module';
import { ResultsModule }       from './results/results.module';
import { LeaveModule }         from './leave/leave.module';
import { RoutineModule }       from './routine/routine.module';
import { NoticesModule }       from './notices/notices.module';
import { CertificatesModule }  from './certificates/certificates.module';
import { GalleryModule }       from './gallery/gallery.module';
import { EventsModule }        from './events/events.module';
import { ContactModule }       from './contact/contact.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule }         from './audit/audit.module';
import { CloudinaryModule }    from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    InstitutionModule,
    UsersModule,
    ClassesModule,
    TeachersModule,
    AdmissionsModule,
    StudentsModule,
    AttendanceModule,
    ResultsModule,
    LeaveModule,
    RoutineModule,
    NoticesModule,
    CertificatesModule,
    GalleryModule,
    EventsModule,
    ContactModule,
    NotificationsModule,
    AuditModule,
    CloudinaryModule,
  ],
})
export class AppModule {}
