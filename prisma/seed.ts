/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Prisma Seed — BD School/College Management Portal
 * Covers ALL 26 models with rich, realistic demo data.
 * ───────────────────────────────────────────────────────────────────────────────
 * Run:  npx ts-node prisma/seed.ts
 *       pnpm db:seed
 * ───────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Database connection ────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const ROUNDS = 12;

// ─── Helpers ────────────────────────────────────────────────────────────────────

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomElement = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const generatePhone = (prefix = '017'): string =>
  `${prefix}${String(randomInt(10000000, 99999999))}`;

/**
 * Bangladesh national grading system (SSC / HSC equivalent).
 */
const GRADE_TABLE: { min: number; max: number; grade: string; gpa: number }[] = [
  { min: 80, max: 100, grade: 'A+', gpa: 5.0 },
  { min: 70, max: 79, grade: 'A', gpa: 4.0 },
  { min: 60, max: 69, grade: 'A-', gpa: 3.5 },
  { min: 50, max: 59, grade: 'B', gpa: 3.0 },
  { min: 40, max: 49, grade: 'C', gpa: 2.0 },
  { min: 33, max: 39, grade: 'D', gpa: 1.0 },
  { min: 0, max: 32, grade: 'F', gpa: 0.0 },
];

function computeGrade(marksObtained: number, fullMarks: number) {
  const pct = (marksObtained / fullMarks) * 100;
  const row = GRADE_TABLE.find((g) => pct >= g.min && pct <= g.max) ?? GRADE_TABLE[6];
  return {
    grade: row.grade,
    gradePoint: row.gpa,
    isPassed: pct >= 33,
  };
}

// ─── Static Data Lists ──────────────────────────────────────────────────────────

const BD_DISTRICTS = [
  'Dhaka', 'Mymensingh', 'Rajshahi', 'Chittagong', 'Khulna',
  'Barisal', 'Sylhet', 'Rangpur', 'Comilla', 'Jessore',
];

const BD_DIVISIONS = ['Dhaka', 'Mymensingh', 'Rajshahi', 'Chittagong', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur'];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const TEACHER_NAMES = [
  { name: 'Md. Abdur Rahman', nameBn: 'মো. আব্দুর রহমান', gender: 'MALE', designation: 'Senior Teacher', qualification: 'M.Sc. in Mathematics, B.Ed.', subject: 'Mathematics' },
  { name: 'Ms. Fatima Khatun', nameBn: 'ফাতিমা খাতুন', gender: 'FEMALE', designation: 'Assistant Teacher', qualification: 'M.A. in English, B.Ed.', subject: 'English' },
  { name: 'Md. Kamal Hossain', nameBn: 'মো. কামাল হোসেন', gender: 'MALE', designation: 'Lecturer', qualification: 'M.Sc. in Physics, M.Ed.', subject: 'Science' },
  { name: 'Mrs. Salma Begum', nameBn: 'সালমা বেগম', gender: 'FEMALE', designation: 'Assistant Teacher', qualification: 'M.A. in Bangla, B.Ed.', subject: 'Bangla' },
  { name: 'Md. Rafiq Islam', nameBn: 'মো. রফিক ইসলাম', gender: 'MALE', designation: 'Senior Lecturer', qualification: 'M.Sc. in Chemistry, Ph.D.', subject: 'Science' },
  { name: 'Ms. Nazma Akter', nameBn: 'নাজমা আক্তার', gender: 'FEMALE', designation: 'Assistant Teacher', qualification: 'M.A. in History, B.Ed.', subject: 'Social Studies' },
  { name: 'Md. Jubayer Ali', nameBn: 'মো. জুবায়ের আলী', gender: 'MALE', designation: 'Junior Lecturer', qualification: 'B.Sc. in Computer Science', subject: 'ICT' },
  { name: 'Mrs. Shahanara Parvin', nameBn: 'শাহানারা পারভীন', gender: 'FEMALE', designation: 'Assistant Teacher', qualification: 'M.A. in Religion, B.Ed.', subject: 'Religion' },
];

const STUDENT_NAMES = [
  { name: 'Ayesha Siddiqua', nameBn: 'আয়েশা সিদ্দিকা', gender: 'FEMALE' },
  { name: 'Md. Tanvir Ahmed', nameBn: 'মো. তানভীর আহমেদ', gender: 'MALE' },
  { name: 'Nusrat Jahan', nameBn: 'নুসরাত জাহান', gender: 'FEMALE' },
  { name: 'Md. Sabbir Hossain', nameBn: 'মো. সাব্বির হোসেন', gender: 'MALE' },
  { name: 'Taslima Akter', nameBn: 'তাসলিমা আক্তার', gender: 'FEMALE' },
  { name: 'Md. Rakibul Hasan', nameBn: 'মো. রাকিবুল হাসান', gender: 'MALE' },
  { name: 'Sharmin Sultana', nameBn: 'শারমিন সুলতানা', gender: 'FEMALE' },
  { name: 'Md. Ariful Islam', nameBn: 'মো. আরিফুল ইসলাম', gender: 'MALE' },
  { name: 'Marjia Khatun', nameBn: 'মার্জিয়া খাতুন', gender: 'FEMALE' },
  { name: 'Md. Sohel Rana', nameBn: 'মো. সোহেল রানা', gender: 'MALE' },
  { name: 'Jannatul Ferdous', nameBn: 'জান্নাতুল ফেরদৌস', gender: 'FEMALE' },
  { name: 'Md. Mehedi Hasan', nameBn: 'মো. মেহেদী হাসান', gender: 'MALE' },
  { name: 'Rabeya Sultana', nameBn: 'রাবেয়া সুলতানা', gender: 'FEMALE' },
  { name: 'Md. Farhan Shahriar', nameBn: 'মো. ফারহান শাহরিয়ার', gender: 'MALE' },
  { name: 'Umme Kulsum', nameBn: 'উম্মে কুলসুম', gender: 'FEMALE' },
  { name: 'Md. Jubair Hossain', nameBn: 'মো. জুবাইর হোসেন', gender: 'MALE' },
  { name: 'Nowrin Jannat', nameBn: 'নওরিন জান্নাত', gender: 'FEMALE' },
  { name: 'Md. Shahidul Islam', nameBn: 'মো. শহিদুল ইসলাম', gender: 'MALE' },
  { name: 'Mst. Rumi Begum', nameBn: 'মোছা. রুমি বেগম', gender: 'FEMALE' },
  { name: 'Md. Nayeem Hossain', nameBn: 'মো. নাঈম হোসেন', gender: 'MALE' },
  { name: 'Sadia Afrin', nameBn: 'সাদিয়া আফরিন', gender: 'FEMALE' },
  { name: 'Md. Russell Mahmud', nameBn: 'মো. রাসেল মাহমুদ', gender: 'MALE' },
  { name: 'Most. Hasna Hena', nameBn: 'মোছা. হাসনা হেনা', gender: 'FEMALE' },
  { name: 'Md. Ikram Hossain', nameBn: 'মো. ইকরাম হোসেন', gender: 'MALE' },
];

const FATHER_NAMES = [
  'Md. Karim Uddin', 'Md. Abdul Halim', 'Md. Belal Hossain', 'Md. Tariqul Islam',
  'Md. Shafiullah', 'Md. Alamgir Hossain', 'Md. Azizur Rahman', 'Md. Fazlul Haque',
  'Md. Golam Mostafa', 'Md. Harun-Or-Rashid', 'Md. Jashim Uddin', 'Md. Kabir Hossain',
  'Md. Liakat Ali', 'Md. Mizanur Rahman', 'Md. Nurul Islam', 'Md. Obaidul Haque',
  'Md. Parvez Ahmed', 'Md. Quamruzzaman', 'Md. Ruhul Amin', 'Md. Shahidul Islam',
  'Md. Taher Uddin', 'Md. Wali Ullah', 'Md. Yeakub Ali', 'Md. Zahid Hossain',
];

const MOTHER_NAMES = [
  'Begum Rokeya', 'Jahanara Begum', 'Saleha Khatun', 'Amina Begum',
  'Khaleda Parvin', 'Shahida Akter', 'Rahima Begum', 'Nasrin Sultana',
  'Maksuda Begum', 'Mahmuda Khatun', 'Shamim Ara', 'Nargis Sultana',
  'Rowshan Ara', 'Ayesha Begum', 'Ferdousi Begum', 'Tahmina Akter',
];

const OCCUPATIONS = ['Service Holder', 'Businessman', 'Teacher', 'Farmer', 'Lawyer', 'Doctor', 'Engineer', 'Day Laborer'];

const SUBJECT_NAMES_BY_LEVEL: Record<number, { name: string; code: string }[]> = {
  6: [
    { name: 'Bangla', code: 'BNG' },
    { name: 'English', code: 'ENG' },
    { name: 'Mathematics', code: 'MTH' },
    { name: 'General Science', code: 'SCI' },
    { name: 'Bangladesh & Global Studies', code: 'BGS' },
    { name: 'Religion & Moral Education', code: 'RME' },
  ],
  7: [
    { name: 'Bangla', code: 'BNG' },
    { name: 'English', code: 'ENG' },
    { name: 'Mathematics', code: 'MTH' },
    { name: 'General Science', code: 'SCI' },
    { name: 'Bangladesh & Global Studies', code: 'BGS' },
    { name: 'Religion & Moral Education', code: 'RME' },
  ],
  8: [
    { name: 'Bangla', code: 'BNG' },
    { name: 'English', code: 'ENG' },
    { name: 'Mathematics', code: 'MTH' },
    { name: 'General Science', code: 'SCI' },
    { name: 'Bangladesh & Global Studies', code: 'BGS' },
    { name: 'Religion & Moral Education', code: 'RME' },
    { name: 'Information & Communication Technology', code: 'ICT' },
  ],
  9: [
    { name: 'Bangla', code: 'BNG' },
    { name: 'English', code: 'ENG' },
    { name: 'Mathematics', code: 'MTH' },
    { name: 'Physics', code: 'PHY' },
    { name: 'Chemistry', code: 'CHM' },
    { name: 'Biology', code: 'BIO' },
    { name: 'Higher Mathematics', code: 'HMT' },
    { name: 'Bangladesh & Global Studies', code: 'BGS' },
    { name: 'Religion & Moral Education', code: 'RME' },
  ],
  10: [
    { name: 'Bangla', code: 'BNG' },
    { name: 'English', code: 'ENG' },
    { name: 'Mathematics', code: 'MTH' },
    { name: 'Physics', code: 'PHY' },
    { name: 'Chemistry', code: 'CHM' },
    { name: 'Biology', code: 'BIO' },
    { name: 'Higher Mathematics', code: 'HMT' },
    { name: 'Bangladesh & Global Studies', code: 'BGS' },
    { name: 'Religion & Moral Education', code: 'RME' },
  ],
};

// ────────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  BD School Portal — Full Seed v2.0\n');
  const startTime = Date.now();

  // ── 0.  Clean existing data (reverse dependency order) ────────────────────────
  console.log('🧹  Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.galleryPhoto.deleteMany();
  await prisma.galleryAlbum.deleteMany();
  await prisma.event.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.routine.deleteMany();
  await prisma.result.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveApplication.deleteMany();
  await prisma.studentSession.deleteMany();
  await prisma.admission.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.teacherSection.deleteMany();
  await prisma.teacherClass.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
  await prisma.academicSession.deleteMany();
  await prisma.institutionSettings.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅  All tables cleaned.\n');

  // =============================================================================
  // PHASE 1 — FOUNDATION DATA
  // =============================================================================
  console.log('📦  Phase 1: Foundation Data');

  // ── 1.1  Institution Settings ──────────────────────────────────────────────────
  await prisma.institutionSettings.create({
    data: {
      id: 'default',
      name: 'Dhaka Model High School & College',
      nameBn: 'ঢাকা মডেল উচ্চ বিদ্যালয় ও কলেজ',
      eiin: '108234',
      address: '123 School Road, Mirpur, Dhaka-1216',
      phone: '02-9876543',
      email: 'info@dmhsc.edu.bd',
      website: 'https://dmhsc.edu.bd',
      principalName: 'Prof. Dr. Abdur Rahim',
      principalMessage: 'Education is the most powerful weapon to change the world. Welcome to Dhaka Model High School & College — a place where dreams take flight.',
      principalPhotoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/principal.jpg',
      established: 1975,
    },
  });
  console.log('✅  Institution settings created');

  // ── 1.2  Academic Sessions ─────────────────────────────────────────────────────
  const session2024 = await prisma.academicSession.create({
    data: {
      id: 'session-2024',
      name: '2024-2025',
      year: 2024,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      isCurrent: false,
    },
  });
  const session2025 = await prisma.academicSession.create({
    data: {
      id: 'session-2025',
      name: '2025-2026',
      year: 2025,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      isCurrent: true,
    },
  });
  const sessions = [session2024, session2025];
  console.log(`✅  Academic sessions created: ${session2024.name}, ${session2025.name} (current)`);

  // ── 1.3  Admin Users ──────────────────────────────────────────────────────────
  const adminHashed = await bcrypt.hash('Admin@123', ROUNDS);
  const superAdminUser = await prisma.user.create({
    data: {
      id: 'user-superadmin',
      email: 'superadmin@school.edu.bd',
      phone: '01700000000',
      password: adminHashed,
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      isActive: true,
    },
  });
  const adminUser = await prisma.user.create({
    data: {
      id: 'user-admin-1',
      email: 'admin@school.edu.bd',
      phone: '01700000001',
      password: adminHashed,
      role: 'ADMIN',
      mustChangePassword: false,
      isActive: true,
      createdById: superAdminUser.id,
    },
  });
  const adminUser2 = await prisma.user.create({
    data: {
      id: 'user-admin-2',
      email: 'admin2@school.edu.bd',
      phone: '01700000002',
      password: adminHashed,
      role: 'ADMIN',
      mustChangePassword: false,
      isActive: true,
      createdById: superAdminUser.id,
    },
  });
  const allAdminUsers = [superAdminUser, adminUser, adminUser2];
  console.log(`✅  Admin users created: superadmin, admin + 1`);

  // ── 1.4  Classes with Sections & Subjects ─────────────────────────────────────
  const shifts = ['MORNING', 'DAY'] as const;
  const classLevels = [
    { name: 'Class 6', level: 6 },
    { name: 'Class 7', level: 7 },
    { name: 'Class 8', level: 8 },
    { name: 'Class 9', level: 9 },
    { name: 'Class 10', level: 10 },
  ];

  const createdClasses: Record<string, any> = {};
  const createdSections: Record<string, any> = {};
  const createdSubjects: Record<string, any> = {};

  for (const session of sessions) {
    for (const cl of classLevels) {
      for (const shift of shifts) {
        const classId = `class-${cl.level}-${shift.toLowerCase()}-${session.year}`;
        const classRec = await prisma.class.create({
          data: {
            id: classId,
            name: cl.name,
            level: cl.level,
            shift: shift as any,
            sessionId: session.id,
          },
        });
        createdClasses[classId] = classRec;

        // Sections: A & B for all; also C for popular classes (level 6-8)
        const sectionNames = cl.level >= 9 ? ['Science', 'Humanities'] : ['A', 'B', ...(cl.level <= 8 ? ['C'] : [])];
        for (const secName of sectionNames) {
          const sectionId = `sec-${cl.level}-${shift.toLowerCase()}-${secName.toLowerCase()}-${session.year}`;
          const secRec = await prisma.section.create({
            data: {
              id: sectionId,
              name: secName,
              capacity: secName === 'Science' ? 60 : 40,
              classId: classRec.id,
            },
          });
          createdSections[sectionId] = secRec;
        }

        // Subjects per class level — use classId in subject ID to avoid collisions
        // across shifts (MORNING/DAY) and sessions
        const subjectList = SUBJECT_NAMES_BY_LEVEL[cl.level] ?? SUBJECT_NAMES_BY_LEVEL[6];
        for (const sub of subjectList) {
          const classShortId = classRec.id.replace(/[^a-z0-9]/g, '-');
          const subjectId = `sub-${sub.code.toLowerCase()}-${classShortId}`;
          const subRec = await prisma.subject.create({
            data: {
              id: subjectId,
              name: sub.name,
              code: `${sub.code}${cl.level}`,
              classId: classRec.id,
            },
          });
          createdSubjects[subjectId] = subRec;
        }
      }
    }
  }
  console.log(`✅  Classes (${Object.keys(createdClasses).length}), sections (${Object.keys(createdSections).length}), subjects created`);

  // =============================================================================
  // PHASE 2 — TEACHERS
  // =============================================================================
  console.log('👨‍🏫  Phase 2: Teacher Data');

  const teacherHashed = await bcrypt.hash('Teacher@123', ROUNDS);
  const createdTeachers: any[] = [];

  for (let i = 0; i < TEACHER_NAMES.length; i++) {
    const t = TEACHER_NAMES[i];
    const idx = i + 1;
    const userId = `user-teacher-${idx}`;
    const teacherId = `teacher-${idx}`;
    const employeeId = `EMP-${String(idx).padStart(3, '0')}`;

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: `teacher${idx}@school.edu.bd`,
        phone: generatePhone('01711'),
        password: teacherHashed,
        role: 'TEACHER',
        mustChangePassword: false,
        isActive: true,
        createdById: adminUser.id,
      },
    });

    const teacher = await prisma.teacher.create({
      data: {
        id: teacherId,
        userId: user.id,
        employeeId,
        fullName: t.name,
        fullNameBn: t.nameBn,
        designation: t.designation,
        qualification: t.qualification,
        gender: t.gender as any,
        dateOfBirth: new Date(`${1970 + randomInt(5, 25)}-0${randomInt(1, 9)}-${randomInt(10, 28)}`),
        phone: user.phone,
        photoUrl: `https://res.cloudinary.com/demo/image/upload/v1/teachers/teacher-${idx}.jpg`,
        joiningDate: new Date(`${2010 + randomInt(0, 14)}-0${randomInt(1, 9)}-${randomInt(10, 28)}`),
        isActive: true,
      },
    });
    createdTeachers.push(teacher);
  }
  console.log(`✅  ${createdTeachers.length} teachers created`);

  // ── 2.2  Teacher ↔ Class / Section / Subject assignments ──────────────────────
  const currentSessionClasses = Object.values(createdClasses).filter(
    (c: any) => c.sessionId === session2025.id,
  ) as any[];

  for (let i = 0; i < createdTeachers.length; i++) {
    const teacher = createdTeachers[i];
    // Each teacher gets 2 classes
    const startIdx = (i * 2) % currentSessionClasses.length;
    const assignedClasses = [
      currentSessionClasses[startIdx],
      currentSessionClasses[(startIdx + 1) % currentSessionClasses.length],
    ];

    for (const cls of assignedClasses) {
      // TeacherClass
      const tcId = `tc-${teacher.id}-${cls.id}`;
      await prisma.teacherClass.upsert({
        where: { teacherId_classId: { teacherId: teacher.id, classId: cls.id } },
        update: {},
        create: { id: tcId, teacherId: teacher.id, classId: cls.id },
      });

      // TeacherSection — assign to first section of each class
      const sectionsForClass = Object.values(createdSections).filter(
        (s: any) => s.classId === cls.id,
      ) as any[];
      if (sectionsForClass.length > 0) {
        const sec = sectionsForClass[0];
        const tsId = `ts-${teacher.id}-${sec.id}`;
        await prisma.teacherSection.upsert({
          where: { teacherId_sectionId: { teacherId: teacher.id, sectionId: sec.id } },
          update: {},
          create: { id: tsId, teacherId: teacher.id, sectionId: sec.id },
        });
      }

      // TeacherSubject — assign teacher to one subject per class
      const subjectsForClass = Object.values(createdSubjects).filter(
        (s: any) => s.classId === cls.id,
      ) as any[];
      if (subjectsForClass.length > 0) {
        const subIdx = i % subjectsForClass.length;
        const sub = subjectsForClass[subIdx];
        const tsubId = `tsub-${teacher.id}-${sub.id}`;
        await prisma.teacherSubject.upsert({
          where: { teacherId_subjectId: { teacherId: teacher.id, subjectId: sub.id } },
          update: {},
          create: { id: tsubId, teacherId: teacher.id, subjectId: sub.id },
        });
      }
    }

    // Set first 4 teachers as class teachers for some sections
    if (i < 4) {
      const secs = Object.values(createdSections).filter((s: any) => {
        const cls = currentSessionClasses.find((c: any) => c.id === s.classId);
        return cls && (cls as any).level === 6 + i;
      }) as any[];
      if (secs.length > 0) {
        await prisma.section.update({
          where: { id: secs[0].id },
          data: { classTeacherId: teacher.id },
        });
      }
    }
  }
  console.log('✅  Teacher-Class/Section/Subject assignments done');

  // =============================================================================
  // PHASE 3 — STUDENTS
  // =============================================================================
  console.log('👩‍🎓  Phase 3: Student Data');

  const studentHashed = await bcrypt.hash('Student@123', ROUNDS);
  const createdStudents: any[] = [];
  const createdStudentSessions: any[] = [];

  // Get sections for current session to distribute students
  const currentSessionSections = Object.values(createdSections).filter(
    (s: any) => {
      const cls = currentSessionClasses.find((c: any) => c.id === s.classId);
      return !!cls;
    },
  ) as any[];

  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const s = STUDENT_NAMES[i];
    const idx = i + 1;
    const userId = `user-student-${idx}`;
    const studentIdStr = `STU-2025-${String(idx).padStart(4, '0')}`;

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: `student${idx}@school.edu.bd`,
        phone: generatePhone('01722'),
        password: studentHashed,
        role: 'STUDENT',
        mustChangePassword: false,
        isActive: true,
        createdById: adminUser.id,
      },
    });

    const father = FATHER_NAMES[i % FATHER_NAMES.length];
    const mother = MOTHER_NAMES[i % MOTHER_NAMES.length];
    const district = randomElement(BD_DISTRICTS);
    const division = BD_DIVISIONS.find((d) => d === district) ?? randomElement(BD_DIVISIONS);

    const student = await prisma.student.create({
      data: {
        id: `student-${idx}`,
        userId: user.id,
        studentId: studentIdStr,
        registrationNo: `REG-2025-${String(idx).padStart(4, '0')}`,
        fullName: s.name,
        fullNameBn: s.nameBn,
        dateOfBirth: new Date(`${2008 + randomInt(0, 5)}-0${randomInt(1, 9)}-${randomInt(10, 28)}`),
        gender: s.gender as any,
        bloodGroup: randomElement(BLOOD_GROUPS),
        photoUrl: `https://res.cloudinary.com/demo/image/upload/v1/students/student-${idx}.jpg`,
        phone: user.phone,
        birthCertNo: `${randomInt(1000000000, 9999999999)}`,
        fatherName: father,
        fatherPhone: generatePhone('01733'),
        fatherOccupation: randomElement(OCCUPATIONS),
        motherName: mother,
        motherPhone: generatePhone('01744'),
        guardianName: father,
        guardianPhone: generatePhone('01733'),
        guardianRelation: 'Father',
        village: `${['Uttara', 'Mirpur', 'Mohammadpur', 'Shyamoli', 'Dhanmondi', 'Bashundhara', 'Banani', 'Gulshan'][i % 8]}`,
        upazila: ['Sadar', 'Savar', 'Keraniganj', 'Gazipur Sadar'][i % 4],
        district,
        division,
        isActive: true,
      },
    });
    createdStudents.push(student);

    // Enroll in a section (rotate through sections)
    const section = currentSessionSections[i % currentSessionSections.length];
    const cls = currentSessionClasses.find((c: any) => c.id === section.classId);
    const ssId = `ss-${student.id}-${session2025.id}`;
    const rollNum = `${2025}${String(cls?.level ?? 6)}${String((i % 40) + 1).padStart(2, '0')}`;

    const ss = await prisma.studentSession.create({
      data: {
        id: ssId,
        studentId: student.id,
        sessionId: session2025.id,
        classId: section.classId,
        sectionId: section.id,
        rollNumber: rollNum,
        admissionDate: new Date('2025-01-01'),
        isPromoted: false,
      },
    });
    createdStudentSessions.push(ss);
  }
  console.log(`✅  ${createdStudents.length} students created and enrolled`);

  // ── 3.2  Admissions (mix of statuses) ─────────────────────────────────────────
  const admissionData = [
    { name: 'Md. Rahim Uddin', status: 'APPROVED', studentIdx: 0, note: 'All documents verified' },
    { name: 'Sultana Razia', status: 'APPROVED', studentIdx: 1, note: 'Eligible for admission' },
    { name: 'Md. Kabir Hossain', status: 'PENDING', studentIdx: null, note: null },
    { name: 'Nargis Akter', status: 'PENDING', studentIdx: null, note: null },
    { name: 'Md. Johir Raihan', status: 'REJECTED', studentIdx: null, note: 'Incomplete documents' },
    { name: 'Shamima Sultana', status: 'PENDING', studentIdx: null, note: null },
    { name: 'Md. Ashikur Rahman', status: 'PENDING', studentIdx: null, note: null },
    { name: 'Jinnatun Nahar', status: 'REJECTED', studentIdx: null, note: 'Age criteria not met' },
  ];

  for (let i = 0; i < admissionData.length; i++) {
    const ad = admissionData[i];
    const cls9 = currentSessionClasses.find((c: any) => c.level === 9 && c.shift === 'MORNING');
    if (!cls9) continue;

    const sec = Object.values(createdSections).find((s: any) => s.classId === cls9.id && s.name === 'A');
    const admissionId = `admission-${i + 1}`;
    const appNo = `ADM-2025-${String(i + 1).padStart(4, '0')}`;

    await prisma.admission.create({
      data: {
        id: admissionId,
        applicationNo: appNo,
        sessionId: session2025.id,
        classId: cls9.id,
        applicantName: ad.name,
        applicantNameBn: ad.name,
        dateOfBirth: new Date('2010-06-15'),
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        bloodGroup: randomElement(BLOOD_GROUPS),
        fatherName: FATHER_NAMES[i],
        motherName: MOTHER_NAMES[i],
        guardianPhone: generatePhone('01755'),
        guardianEmail: `guardian${i + 1}@email.com`,
        previousSchool: 'Mirpur Government School',
        previousClass: 'Class 8',
        status: ad.status as any,
        reviewNote: ad.note,
        reviewedBy: ad.status !== 'PENDING' ? adminUser.id : null,
        reviewedAt: ad.status !== 'PENDING' ? new Date() : null,
        studentId: ad.studentIdx !== null ? createdStudents[ad.studentIdx]?.id : null,
        submittedAt: new Date(`2025-0${randomInt(1, 3)}-${randomInt(10, 28)}`),
      },
    });
  }
  console.log('✅  8 admission applications created (mix of PENDING/APPROVED/REJECTED)');

  // =============================================================================
  // PHASE 4 — ACADEMIC DATA
  // =============================================================================
  console.log('📚  Phase 4: Academic Data');

  // ── 4.1  Exams ────────────────────────────────────────────────────────────────
  const exams = await Promise.all([
    prisma.exam.create({
      data: {
        id: 'exam-mt-2025',
        name: 'Monthly Test — March 2025',
        type: 'MONTHLY',
        sessionId: session2025.id,
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-20'),
        isPublished: true,
        publishedAt: new Date('2025-03-25'),
        createdBy: adminUser.id,
      },
    }),
    prisma.exam.create({
      data: {
        id: 'exam-halfyearly-2025',
        name: 'Half-Yearly Examination 2025',
        type: 'HALF_YEARLY',
        sessionId: session2025.id,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-15'),
        isPublished: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.exam.create({
      data: {
        id: 'exam-mt-2024',
        name: 'Monthly Test — April 2024',
        type: 'MONTHLY',
        sessionId: session2024.id,
        startDate: new Date('2024-04-10'),
        endDate: new Date('2024-04-15'),
        isPublished: true,
        publishedAt: new Date('2024-04-20'),
        createdBy: adminUser.id,
      },
    }),
    prisma.exam.create({
      data: {
        id: 'exam-annual-2024',
        name: 'Annual Examination 2024',
        type: 'ANNUAL',
        sessionId: session2024.id,
        startDate: new Date('2024-11-01'),
        endDate: new Date('2024-11-20'),
        isPublished: true,
        publishedAt: new Date('2024-12-01'),
        createdBy: adminUser.id,
      },
    }),
  ]);
  console.log(`✅  ${exams.length} exams created`);

  // ── 4.2  Results ──────────────────────────────────────────────────────────────
  // Publish results for the Monthly Test 2025 exam only
  const mt2025Exam = exams[0];
  let resultCount = 0;

  for (const student of createdStudents) {
    // Get the student's enrolled class from StudentSession
    const ss = createdStudentSessions.find((s: any) => s.studentId === student.id);
    if (!ss) continue;

    // Get subjects for that class
    const classSubjects = Object.values(createdSubjects).filter(
      (sub: any) => sub.classId === ss.classId,
    ) as any[];
    if (classSubjects.length === 0) continue;

    // Find a teacher assigned to this class
    const teacher = createdTeachers[createdStudents.indexOf(student) % createdTeachers.length];

    for (const subject of classSubjects) {
      const fullMarks = 100;
      const marksObtained = randomInt(35, 98);
      const { grade, gradePoint, isPassed } = computeGrade(marksObtained, fullMarks);
      const resultId = `result-${student.id}-${mt2025Exam.id}-${subject.id}`;

      await prisma.result.create({
        data: {
          id: resultId,
          studentId: student.id,
          examId: mt2025Exam.id,
          subjectId: subject.id,
          teacherId: teacher.id,
          fullMarks,
          marksObtained,
          grade,
          gradePoint,
          isPassed,
          status: 'PUBLISHED',
          publishedAt: new Date('2025-03-25'),
        },
      });
      resultCount++;
    }
  }

  // Also create some SUBMITTED results for the Half-Yearly exam (not yet published)
  const hy2025Exam = exams[1];
  for (const student of createdStudents.slice(0, 10)) {
    const ss = createdStudentSessions.find((s: any) => s.studentId === student.id);
    if (!ss) continue;

    const classSubjects = Object.values(createdSubjects).filter(
      (sub: any) => sub.classId === ss.classId,
    ) as any[];
    if (classSubjects.length === 0) continue;

    const teacher = createdTeachers[createdStudents.indexOf(student) % createdTeachers.length];

    for (const subject of classSubjects.slice(0, 3)) {
      const fullMarks = 100;
      const marksObtained = randomInt(30, 95);
      const { grade, gradePoint, isPassed } = computeGrade(marksObtained, fullMarks);

      await prisma.result.create({
        data: {
          id: `result-hy-${student.id}-${subject.id}`,
          studentId: student.id,
          examId: hy2025Exam.id,
          subjectId: subject.id,
          teacherId: teacher.id,
          fullMarks,
          marksObtained,
          grade,
          gradePoint,
          isPassed,
          status: 'SUBMITTED',
        },
      });
      resultCount++;
    }
  }
  console.log(`✅  ${resultCount} results created`);

  // ── 4.3  Routines (Timetable) ─────────────────────────────────────────────────
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const TIME_SLOTS = [
    { period: 1, start: '08:00', end: '08:45' },
    { period: 2, start: '08:45', end: '09:30' },
    { period: 3, start: '09:30', end: '10:15' },
    { period: 4, start: '10:30', end: '11:15' },
    { period: 5, start: '11:15', end: '12:00' },
    { period: 6, start: '12:00', end: '12:45' },
  ];

  let routineCount = 0;
  const sampleSections = currentSessionSections.slice(0, 4); // 4 sample sections

  for (const section of sampleSections) {
    const classSubjects = Object.values(createdSubjects).filter(
      (sub: any) => sub.classId === section.classId,
    ) as any[];

    for (let day = 0; day < 5; day++) {
      for (let periodIdx = 0; periodIdx < 6; periodIdx++) {
        const subject = classSubjects[periodIdx % classSubjects.length];
        const slot = TIME_SLOTS[periodIdx];
        const routineId = `routine-${section.id}-${day}-${periodIdx + 1}`;

        await prisma.routine.create({
          data: {
            id: routineId,
            sectionId: section.id,
            subjectId: subject.id,
            dayOfWeek: day,
            period: slot.period,
            startTime: slot.start,
            endTime: slot.end,
            roomNo: `${100 + randomInt(1, 30)}`,
          },
        });
        routineCount++;
      }
    }
  }
  console.log(`✅  ${routineCount} routine slots created for ${sampleSections.length} sections`);

  // ── 4.4  Attendance ───────────────────────────────────────────────────────────
  // Generate 15 school days of attendance for all students
  let attendanceCount = 0;
  const schoolDays: Date[] = [];
  const startDate = new Date('2025-03-01');
  for (let d = 0; d < 22; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dayOfWeek = date.getDay();
    // Sunday (0) to Thursday (4) are school days
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      schoolDays.push(date);
    }
    if (schoolDays.length >= 15) break;
  }

  for (const date of schoolDays) {
    for (const student of createdStudents) {
      const ss = createdStudentSessions.find((s: any) => s.studentId === student.id);
      if (!ss) continue;

      // Find the section's class teacher, else pick first teacher
      const section = Object.values(createdSections).find((s: any) => s.id === ss.sectionId) as any;
      const teacherId = section?.classTeacherId ?? createdTeachers[0].id;

      // ~85% present, ~10% absent, ~5% late
      const rand = Math.random();
      const status = rand < 0.85 ? 'PRESENT' : rand < 0.95 ? 'ABSENT' : 'LATE';

      const attId = `att-${student.id}-${date.toISOString().split('T')[0]}`;
      await prisma.attendance.create({
        data: {
          id: attId,
          studentId: student.id,
          sectionId: ss.sectionId,
          date,
          status: status as any,
          takenById: teacherId,
        },
      });
      attendanceCount++;
    }
  }
  console.log(`✅  ${attendanceCount} attendance records created (${schoolDays.length} days)`);

  // =============================================================================
  // PHASE 5 — OPERATIONAL DATA
  // =============================================================================
  console.log('⚙️   Phase 5: Operational Data');

  // ── 5.1  Leave Applications ───────────────────────────────────────────────────
  const leaveTypes = ['CASUAL', 'SICK', 'EARNED'] as const;
  const leaveReasons = [
    'Medical treatment required',
    'Family emergency',
    'Personal reasons',
    'Religious pilgrimage',
    'Marriage ceremony in family',
    'Examination preparation at home',
    'Medical leave due to fever',
    'Urgent family matter',
  ];

  for (let i = 0; i < 8; i++) {
    const isStudent = i < 4;
    const studentId = isStudent ? createdStudents[i % createdStudents.length].id : null;
    const teacherId = isStudent ? null : createdTeachers[i % createdTeachers.length].id;
    const statuses: ('PENDING' | 'APPROVED' | 'REJECTED')[] = ['PENDING', 'APPROVED', 'REJECTED', 'APPROVED'];
    const leaveId = `leave-${i + 1}`;
    const fromDate = new Date(`2025-0${randomInt(3, 5)}-${randomInt(10, 20)}`);
    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + randomInt(1, 5));

    await prisma.leaveApplication.create({
      data: {
        id: leaveId,
        applicantType: isStudent ? 'student' : 'teacher',
        studentId,
        teacherId,
        leaveType: leaveTypes[i % 3],
        fromDate,
        toDate,
        reason: leaveReasons[i],
        status: statuses[i],
        reviewedBy: statuses[i] !== 'PENDING' ? adminUser.id : null,
        reviewNote: statuses[i] === 'REJECTED' ? 'Insufficient documentation' : statuses[i] === 'APPROVED' ? 'Leave granted' : null,
        reviewedAt: statuses[i] !== 'PENDING' ? new Date() : null,
      },
    });
  }
  console.log('✅  8 leave applications created');

  // ── 5.2  Notices ──────────────────────────────────────────────────────────────
  const noticesData = [
    { title: 'Half-Yearly Exam Schedule Published', body: 'The schedule for Half-Yearly Examination 2025 has been published. Students are advised to collect their admit cards from the academic office.', category: 'EXAM' },
    { title: 'School Reopening After Summer Vacation', body: 'The school will reopen on 15 August 2025 after the summer vacation. All students must attend classes regularly.', category: 'ACADEMIC' },
    { title: 'Holiday Notice — Victory Day', body: 'The school will remain closed on 16 December 2025 in observance of Victory Day.', category: 'HOLIDAY' },
    { title: 'Admission Open for 2026 Session', body: 'Online admission for the academic year 2026-2027 has started. Please visit the admission portal for details.', category: 'ADMISSION' },
    { title: 'Notice for Guardians — Parent-Teacher Meeting', body: 'A parent-teacher meeting will be held on 25 July 2025 at 10:00 AM in the school auditorium.', category: 'GENERAL' },
    { title: 'Annual Sports Day Celebration', body: 'The Annual Sports Day will be held on 12 February 2026. Students interested in participating must register by 31 January.', category: 'GENERAL' },
    { title: 'Science Fair Results', body: 'Congratulations to all winners of the Inter-Class Science Fair 2025. Results are published on the notice board.', category: 'ACADEMIC' },
    { title: 'Important: ICT Class Schedule Change', body: 'ICT classes for Class 9 and 10 have been rescheduled to Tuesday and Thursday from 11:15 AM to 12:00 PM.', category: 'ACADEMIC' },
  ];

  for (let i = 0; i < noticesData.length; i++) {
    const n = noticesData[i];
    const teacher = createdTeachers[i % createdTeachers.length];
    await prisma.notice.create({
      data: {
        id: `notice-${i + 1}`,
        title: n.title,
        body: n.body,
        category: n.category as any,
        publishedById: teacher.id,
        isPublic: i < 5, // first 5 are public
        expiresAt: i < 5 ? new Date('2026-12-31') : null,
        createdAt: new Date(`2025-0${randomInt(1, 6)}-${randomInt(10, 28)}`),
      },
    });
  }
  console.log('✅  8 notices created');

  // ── 5.3  Certificates ─────────────────────────────────────────────────────────
  const certTypes = ['TESTIMONIAL', 'CHARACTER', 'MERIT', 'PARTICIPATION', 'CUSTOM', 'MERIT'] as const;
  const certTitles = [
    'Testimonial Certificate',
    'Character Certificate',
    'Merit Certificate — Top Performer',
    'Participation Certificate — Science Fair',
    'Custom Certificate — Cultural Program',
    'Merit Certificate — Sports Achievement',
  ];
  const certStatuses = ['PUBLISHED', 'PUBLISHED', 'APPROVED', 'DRAFT', 'DRAFT', 'APPROVED'] as const;

  for (let i = 0; i < certTypes.length; i++) {
    const student = createdStudents[i % createdStudents.length];
    const isPublished = certStatuses[i] === 'PUBLISHED';

    await prisma.certificate.create({
      data: {
        id: `cert-${i + 1}`,
        studentId: student.id,
        type: certTypes[i],
        title: certTitles[i],
        body: `This is to certify that ${student.fullName} has successfully completed the requirements.`,
        pdfUrl: isPublished ? `https://res.cloudinary.com/demo/certificates/cert-${i + 1}.pdf` : null,
        status: certStatuses[i],
        issuedDate: isPublished ? new Date('2025-03-30') : null,
        approvedBy: isPublished || certStatuses[i] === 'APPROVED' ? adminUser.id : null,
        approvedAt: isPublished || certStatuses[i] === 'APPROVED' ? new Date('2025-03-28') : null,
        createdBy: adminUser.id,
      },
    });
  }
  console.log('✅  6 certificates created (mix of statuses)');

  // =============================================================================
  // PHASE 6 — PUBLIC WEBSITE DATA
  // =============================================================================
  console.log('🌐  Phase 6: Public Website Data');

  // ── 6.1  Gallery Albums & Photos ──────────────────────────────────────────────
  const albumsData = [
    { name: 'Annual Cultural Program 2025', description: 'A celebration of our students\' cultural talents — music, dance, and drama performances.', eventDate: new Date('2025-02-15'), coverUrl: 'https://res.cloudinary.com/demo/image/upload/v1/gallery/cover-cultural.jpg' },
    { name: 'Annual Sports Day 2025', description: 'Highlights from the school\'s Annual Sports Day — races, relays, and prize giving.', eventDate: new Date('2025-02-28'), coverUrl: 'https://res.cloudinary.com/demo/image/upload/v1/gallery/cover-sports.jpg' },
    { name: 'Academic Excellence 2025', description: 'Photos from the Academic Award Ceremony honoring top performers.', eventDate: new Date('2025-03-30'), coverUrl: 'https://res.cloudinary.com/demo/image/upload/v1/gallery/cover-academic.jpg' },
  ];

  const photoCaptions = [
    'Students performing traditional dance',
    'Cultural program opening ceremony',
    'Music performance by Class 9 students',
    'Drama performance — "Bijoyer Alo"',
    'Audience enjoying the cultural show',
    '100m sprint race finals',
    'High jump competition',
    'Relay race — Class 8 team',
    'Prize giving ceremony by the Principal',
    'Sports Day closing ceremony',
    'Top performers with their certificates',
    'Academic award ceremony — Class 10',
    'Merit scholarship recipients',
    'Principal\'s speech at award ceremony',
    'Group photo of award winners',
  ];

  let photoCount = 0;
  for (let i = 0; i < albumsData.length; i++) {
    const album = albumsData[i];
    const albumId = `album-${i + 1}`;

    await prisma.galleryAlbum.create({
      data: {
        id: albumId,
        name: album.name,
        description: album.description,
        eventDate: album.eventDate,
        coverUrl: album.coverUrl,
        createdBy: adminUser.id,
      },
    });

    // Create 5 photos per album
    for (let p = 0; p < 5; p++) {
      const photoIdx = i * 5 + p;
      await prisma.galleryPhoto.create({
        data: {
          id: `photo-${photoIdx + 1}`,
          albumId,
          url: `https://res.cloudinary.com/demo/image/upload/v1/gallery/photo-${photoIdx + 1}.jpg`,
          caption: photoCaptions[photoIdx],
          sortOrder: p,
        },
      });
      photoCount++;
    }
  }
  console.log(`✅  3 gallery albums with ${photoCount} photos created`);

  // ── 6.2  Events ───────────────────────────────────────────────────────────────
  const eventsData = [
    { title: 'Parent-Teacher Meeting', description: 'Quarterly parent-teacher meeting to discuss student progress.', eventDate: new Date('2025-07-25'), endDate: new Date('2025-07-25'), venue: 'School Auditorium', isPublic: true },
    { title: 'Annual Prize Giving Ceremony', description: 'Annual ceremony to honor academic, cultural, and sports achievers.', eventDate: new Date('2025-12-20'), endDate: new Date('2025-12-20'), venue: 'School Main Hall', isPublic: true },
    { title: 'Science & Technology Fair', description: 'Inter-class science project exhibition and competition.', eventDate: new Date('2026-01-15'), endDate: new Date('2026-01-16'), venue: 'School Ground', isPublic: true },
    { title: 'National Mourning Day Program', description: 'Commemoration program on the National Mourning Day.', eventDate: new Date('2025-08-15'), endDate: null, venue: 'School Auditorium', isPublic: true },
    { title: 'Faculty Development Workshop', description: 'Professional development workshop for teachers.', eventDate: new Date('2026-02-10'), endDate: new Date('2026-02-11'), venue: 'Teacher\'s Lounge', isPublic: false },
  ];

  for (let i = 0; i < eventsData.length; i++) {
    const e = eventsData[i];
    await prisma.event.create({
      data: {
        id: `event-${i + 1}`,
        title: e.title,
        description: e.description,
        eventDate: e.eventDate,
        endDate: e.endDate,
        venue: e.venue,
        posterUrl: `https://res.cloudinary.com/demo/image/upload/v1/events/poster-${i + 1}.jpg`,
        isPublic: e.isPublic,
        createdBy: adminUser.id,
      },
    });
  }
  console.log('✅  5 events created');

  // ── 6.3  Contact Messages ─────────────────────────────────────────────────────
  const contactMessages = [
    { name: 'Mr. Hasan Mahmud', email: 'hasan@email.com', phone: '01711111111', subject: 'Admission Inquiry', message: 'I would like to know about the admission process for Class 6. What documents are required?', isRead: true, repliedAt: new Date('2025-02-05') },
    { name: 'Mrs. Nasrin Akter', email: 'nasrin@email.com', phone: '01722222222', subject: 'Transfer Certificate Request', message: 'I need a transfer certificate for my daughter who is moving to Chittagong.', isRead: true, repliedAt: new Date('2025-03-10') },
    { name: 'Md. Shafiqur Rahman', email: 'shafiq@email.com', phone: '01733333333', subject: 'Fee Structure Query', message: 'Could you please share the updated fee structure for Class 9 and Class 10?', isRead: false, repliedAt: null },
    { name: 'Mr. Tariqul Islam', email: 'tariqul@email.com', phone: '01744444444', subject: 'School Timing', message: 'What are the school timing for the morning shift and day shift?', isRead: false, repliedAt: null },
    { name: 'Ms. Farzana Hossain', email: 'farzana@email.com', phone: '01755555555', subject: 'Lost Certificate', message: 'I lost my academic certificate. What is the procedure to get a duplicate?', isRead: true, repliedAt: new Date('2025-04-15') },
  ];

  for (let i = 0; i < contactMessages.length; i++) {
    const m = contactMessages[i];
    await prisma.contactMessage.create({
      data: {
        id: `contact-${i + 1}`,
        name: m.name,
        email: m.email,
        phone: m.phone,
        subject: m.subject,
        message: m.message,
        isRead: m.isRead,
        repliedAt: m.repliedAt,
      },
    });
  }
  console.log('✅  5 contact messages created');

  // =============================================================================
  // PHASE 7 — NOTIFICATIONS
  // =============================================================================
  console.log('🔔  Phase 7: Notifications');

  let notifCount = 0;

  // For all students: notify about published results
  for (const student of createdStudents) {
    const user = await prisma.user.findUnique({ where: { id: `user-student-${createdStudents.indexOf(student) + 1}` } });
    if (!user) continue;

    await prisma.notification.create({
      data: {
        id: `notif-result-${student.id}`,
        userId: user.id,
        title: 'Results Published',
        body: `Your Monthly Test 2025 results have been published. Check your result dashboard.`,
        type: 'result',
        link: `/student/results/${mt2025Exam.id}`,
      },
    });
    notifCount++;
  }

  // For specific students: certificate notifications
  for (let i = 0; i < 3; i++) {
    const student = createdStudents[i];
    const user = await prisma.user.findUnique({ where: { id: `user-student-${i + 1}` } });
    if (!user) continue;

    await prisma.notification.create({
      data: {
        id: `notif-cert-${student.id}`,
        userId: user.id,
        title: 'Certificate Ready',
        body: `Your ${['Testimonial', 'Character', 'Merit'][i]} certificate has been published. You can now download it.`,
        type: 'certificate',
        link: `/student/certificates`,
      },
    });
    notifCount++;
  }

  // For teachers: notifications about submitted results
  for (let i = 0; i < 4; i++) {
    const teacher = createdTeachers[i];
    const user = await prisma.user.findUnique({ where: { id: `user-teacher-${i + 1}` } });
    if (!user) continue;

    await prisma.notification.create({
      data: {
        id: `notif-teacher-${teacher.id}`,
        userId: user.id,
        title: 'Results Under Review',
        body: `Results you submitted for Half-Yearly Exam are pending admin approval.`,
        type: 'general',
      },
    });
    notifCount++;
  }

  // For admin: notifications about new admissions and contact messages
  const adminNotifs = [
    { title: 'New Admission Applications', body: '3 new admission applications are pending review.', type: 'admission', link: '/admin/admissions' },
    { title: 'Contact Message Received', body: '2 unread messages in the contact inbox.', type: 'general', link: '/admin/messages' },
    { title: 'Leave Applications Pending', body: '4 leave applications need your approval.', type: 'general', link: '/admin/leaves' },
  ];

  for (const notif of adminNotifs) {
    await prisma.notification.create({
      data: {
        id: `notif-admin-${adminNotifs.indexOf(notif) + 1}`,
        userId: adminUser.id,
        title: notif.title,
        body: notif.body,
        type: notif.type,
        link: notif.link,
      },
    });
    notifCount++;
  }

  console.log(`✅  ${notifCount} notifications created`);

  // =============================================================================
  // SUMMARY
  // =============================================================================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           🌱  BD School Portal — Seed Complete!                  ║
╠══════════════════════════════════════════════════════════════════╣
║  Time elapsed          : ${elapsed}s                                     ║
╠══════════════════════════════════════════════════════════════════╣
║  📦  Foundation        : InstitutionSettings, 2 Sessions,        ║
║                           3 Admins, 20 Classes, 40 Sections,     ║
║                           ~120 Subjects                           ║
║  👨‍🏫  Teachers          : 8 teachers with full assignments        ║
║  👩‍🎓  Students          : 24 students with enrollments            ║
║  📚  Academics         : 4 exams, ${resultCount} results, ${routineCount}      ║
║                           routine slots, ${attendanceCount} attendance         ║
║  ⚙️   Operations        : 8 leaves, 8 notices, 6 certificates     ║
║  🌐  Public Website    : 3 albums, ${photoCount} photos, 5 events, ║
║                           5 contact messages                      ║
║  🔔  Notifications     : ${notifCount} notifications                       ║
╠══════════════════════════════════════════════════════════════════╣
║  🔑  LOGIN CREDENTIALS                                            ║
║  ──────────────────────────────────────────────────────────────── ║
║  Super Admin  → superadmin@school.edu.bd  /  Admin@123            ║
║  Admin        → admin@school.edu.bd        /  Admin@123           ║
║  Admin 2      → admin2@school.edu.bd       /  Admin@123           ║
║  Teachers     → teacher1..8@school.edu.bd  /  Teacher@123         ║
║  Students     → student1..24@school.edu.bd /  Student@123         ║
╠══════════════════════════════════════════════════════════════════╣
║  🌐  Swagger UI       → http://localhost:3000/api/docs            ║
╚══════════════════════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => {
    console.error('\n❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
