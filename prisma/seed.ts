/**
 * Prisma Seed — BD School/College Management Portal
 * Run: npx ts-node prisma/seed.ts
 */
import { PrismaClient, Role, Shift } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const ROUNDS = 12;

async function main() {
  console.log('\n🌱 Seeding BD School Portal...\n');

  // ── Institution settings ────────────────────────────────────────────────────
  await prisma.institutionSettings.upsert({
    where:  { id: 'default' },
    update: {},
    create: {
      id:               'default',
      name:             'Dhaka Model High School & College',
      nameBn:           'ঢাকা মডেল উচ্চ বিদ্যালয় ও কলেজ',
      eiin:             '108234',
      address:          '123 School Road, Mirpur, Dhaka-1216',
      phone:            '02-9876543',
      email:            'info@school.edu.bd',
      website:          'https://school.edu.bd',
      principalName:    'Dr. Abdur Rahim',
      principalMessage: 'Welcome to Dhaka Model High School & College. We are committed to excellence in education.',
      established:      1975,
    },
  });
  console.log('✅ Institution settings created');

  // ── Super Admin ─────────────────────────────────────────────────────────────
  const superAdminPass = await bcrypt.hash('SuperAdmin@123', ROUNDS);
  const superAdmin = await prisma.user.upsert({
    where:  { email: 'superadmin@school.edu.bd' },
    update: {},
    create: {
      email:               'superadmin@school.edu.bd',
      phone:               '01700000000',
      password:            superAdminPass,
      role:                Role.SUPER_ADMIN,
      mustChangePassword:  false,
      isActive:            true,
    },
  });
  console.log('✅ Super Admin → superadmin@school.edu.bd / SuperAdmin@123');

  // ── Admin ───────────────────────────────────────────────────────────────────
  const adminPass = await bcrypt.hash('Admin@123', ROUNDS);
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@school.edu.bd' },
    update: {},
    create: {
      email:               'admin@school.edu.bd',
      phone:               '01700000001',
      password:            adminPass,
      role:                Role.ADMIN,
      mustChangePassword:  false,
      isActive:            true,
      createdById:         superAdmin.id,
    },
  });
  console.log('✅ Admin       → admin@school.edu.bd / Admin@123');

  // ── Academic Session ─────────────────────────────────────────────────────────
  const session = await prisma.academicSession.upsert({
    where:  { year: 2025 },
    update: { isCurrent: true },
    create: { name: '2025-2026', year: 2025, startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), isCurrent: true },
  });
  console.log(`✅ Academic session: ${session.name} (current)`);

  // ── Classes ──────────────────────────────────────────────────────────────────
  const classLevels = [
    { name: 'Class 6',  level: 6  },
    { name: 'Class 7',  level: 7  },
    { name: 'Class 8',  level: 8  },
    { name: 'Class 9',  level: 9  },
    { name: 'Class 10', level: 10 },
  ];

  const createdClasses: Record<number, any> = {};
  for (const cl of classLevels) {
    const existing = await prisma.class.findFirst({ where: { level: cl.level, sessionId: session.id, shift: Shift.MORNING } });
    const classRec = existing ?? await prisma.class.create({
      data: { name: cl.name, level: cl.level, shift: Shift.MORNING, sessionId: session.id },
    });
    createdClasses[cl.level] = classRec;

    // Sections A & B
    for (const sName of ['A', 'B']) {
      const exSec = await prisma.section.findFirst({ where: { classId: classRec.id, name: sName } });
      if (!exSec) await prisma.section.create({ data: { classId: classRec.id, name: sName, capacity: 40 } });
    }

    // Subjects
    const subjects = [
      { name: 'Bangla',                        code: `BNG${cl.level}` },
      { name: 'English',                        code: `ENG${cl.level}` },
      { name: 'Mathematics',                    code: `MTH${cl.level}` },
      { name: 'General Science',               code: `SCI${cl.level}` },
      { name: 'Bangladesh & Global Studies',   code: `BGS${cl.level}` },
      { name: 'Religion & Moral Education',    code: `RME${cl.level}` },
      ...(cl.level >= 9 ? [
        { name: 'Physics',   code: `PHY${cl.level}` },
        { name: 'Chemistry', code: `CHM${cl.level}` },
        { name: 'Biology',   code: `BIO${cl.level}` },
        { name: 'Higher Mathematics', code: `HMT${cl.level}` },
      ] : []),
    ];
    for (const sub of subjects) {
      const exSub = await prisma.subject.findFirst({ where: { code: sub.code, classId: classRec.id } });
      if (!exSub) await prisma.subject.create({ data: { name: sub.name, code: sub.code, classId: classRec.id } });
    }
  }
  console.log('✅ Classes 6–10 with sections A/B and subjects created');

  // ── Teacher ──────────────────────────────────────────────────────────────────
  const teacherPass = await bcrypt.hash('Teacher@123', ROUNDS);
  const teacherUser = await prisma.user.upsert({
    where:  { email: 'teacher@school.edu.bd' },
    update: {},
    create: {
      email:               'teacher@school.edu.bd',
      phone:               '01711000001',
      password:            teacherPass,
      role:                Role.TEACHER,
      mustChangePassword:  false,
      isActive:            true,
      createdById:         admin.id,
    },
  });

  const teacher = await prisma.teacher.upsert({
    where:  { employeeId: 'EMP-001' },
    update: {},
    create: {
      userId:       teacherUser.id,
      employeeId:   'EMP-001',
      fullName:     'Md. Abdur Rahman',
      fullNameBn:   'মো. আব্দুর রহমান',
      designation:  'Senior Teacher',
      qualification:'M.Sc. in Mathematics, B.Ed.',
      gender:       'MALE',
      joiningDate:  new Date('2015-01-01'),
      phone:        '01711000001',
    },
  });

  // Assign teacher to Class 9 & 10 sections and math subject
  const class9 = createdClasses[9];
  const class10 = createdClasses[10];
  if (class9 && class10) {
    const sec9A = await prisma.section.findFirst({ where: { classId: class9.id, name: 'A' } });
    const sec10A = await prisma.section.findFirst({ where: { classId: class10.id, name: 'A' } });
    const math9 = await prisma.subject.findFirst({ where: { code: `MTH9`, classId: class9.id } });
    const math10 = await prisma.subject.findFirst({ where: { code: `MTH10`, classId: class10.id } });

    for (const classId of [class9.id, class10.id]) {
      await prisma.teacherClass.upsert({ where: { teacherId_classId: { teacherId: teacher.id, classId } }, update: {}, create: { teacherId: teacher.id, classId } });
    }
    for (const sectionId of [sec9A?.id, sec10A?.id].filter(Boolean) as string[]) {
      await prisma.teacherSection.upsert({ where: { teacherId_sectionId: { teacherId: teacher.id, sectionId } }, update: {}, create: { teacherId: teacher.id, sectionId } });
    }
    for (const subjectId of [math9?.id, math10?.id].filter(Boolean) as string[]) {
      await prisma.teacherSubject.upsert({ where: { teacherId_subjectId: { teacherId: teacher.id, subjectId } }, update: {}, create: { teacherId: teacher.id, subjectId } });
    }

    // Set class teacher for Class 9A
    if (sec9A) await prisma.section.update({ where: { id: sec9A.id }, data: { classTeacherId: teacher.id } });
  }
  console.log('✅ Teacher     → teacher@school.edu.bd / Teacher@123 (EMP-001)');

  // ── Student (via manual creation, not admission) ──────────────────────────
  const studentPass = await bcrypt.hash('Student@123', ROUNDS);
  const studentUser = await prisma.user.upsert({
    where:  { email: 'student@school.edu.bd' },
    update: {},
    create: {
      email:               'student@school.edu.bd',
      phone:               '01722000001',
      password:            studentPass,
      role:                Role.STUDENT,
      mustChangePassword:  false,
      isActive:            true,
      createdById:         admin.id,
    },
  });

  const student = await prisma.student.upsert({
    where:  { studentId: 'STU-2025-0001' },
    update: {},
    create: {
      userId:       studentUser.id,
      studentId:    'STU-2025-0001',
      fullName:     'Fatema Begum',
      fullNameBn:   'ফাতেমা বেগম',
      dateOfBirth:  new Date('2011-05-15'),
      gender:       'FEMALE',
      bloodGroup:   'B+',
      fatherName:   'Md. Karim',
      fatherPhone:  '01733000001',
      motherName:   'Begum Nasrin',
      motherPhone:  '01733000002',
      guardianPhone:'01733000001',
      district:     'Dhaka',
      division:     'Dhaka',
      phone:        '01722000001',
    },
  });

  // Enroll in Class 9A, session 2025
  const class9Rec = createdClasses[9];
  const sec9A = class9Rec && await prisma.section.findFirst({ where: { classId: class9Rec.id, name: 'A' } });
  if (sec9A) {
    const exEnroll = await prisma.studentSession.findUnique({ where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } } });
    if (!exEnroll) {
      await prisma.studentSession.create({
        data: { studentId: student.id, sessionId: session.id, classId: class9Rec.id, sectionId: sec9A.id, rollNumber: '2025901', admissionDate: new Date() },
      });
    }
  }
  console.log('✅ Student     → STU-2025-0001 / Student@123 (Class 9A, Roll: 2025901)');

  // ── Sample exam ───────────────────────────────────────────────────────────
  const exam = await prisma.exam.upsert({
    where: { id: 'exam-half-yearly-2025' },
    update: {},
    create: {
      id: 'exam-half-yearly-2025',
      name: 'Half-Yearly Examination 2025',
      type: 'HALF_YEARLY',
      sessionId: session.id,
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-06-15'),
      isPublished: false,
      createdBy: admin.id,
    },
  });
  console.log(`✅ Exam: ${exam.name}`);

  console.log(`
╔══════════════════════════════════════════════════════════╗
║           BD School Portal — Seed Complete               ║
╠══════════════════════════════════════════════════════════╣
║  Super Admin  superadmin@school.edu.bd  SuperAdmin@123   ║
║  Admin        admin@school.edu.bd       Admin@123        ║
║  Teacher      teacher@school.edu.bd     Teacher@123      ║
║               EMP-001 (also works as login)              ║
║  Student      student@school.edu.bd     Student@123      ║
║               STU-2025-0001 (also works as login)        ║
╠══════════════════════════════════════════════════════════╣
║  Swagger UI → http://localhost:3000/api/docs             ║
╚══════════════════════════════════════════════════════════╝
  `);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
