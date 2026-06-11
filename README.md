# 🏫 BD School/College Management Portal — Backend

**NestJS · Prisma ORM · PostgreSQL · JWT + Cookie Auth · Full Swagger Docs**

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT secrets at minimum

# 3. Make sure PostgreSQL is running on localhost:5432, then generate Prisma client + migrate
npm run db:generate
npm run db:migrate

# 5. Seed initial data
npm run db:seed

# 6. Start dev server
npm run start:dev
```

**Swagger UI:** http://localhost:3000/api/docs
**API Base:** http://localhost:3000/api/v1

---

## 🔑 Default Credentials (after seed)

| Role        | Login                                      | Password         | Notes                  |
| ----------- | ------------------------------------------ | ---------------- | ---------------------- |
| Super Admin | `superadmin@school.edu.bd`                 | `SuperAdmin@123` | Full access            |
| Admin       | `admin@school.edu.bd`                      | `Admin@123`      | Academic management    |
| Teacher     | `teacher@school.edu.bd` OR `EMP-001`       | `Teacher@123`    | Class 9A math teacher  |
| Student     | `student@school.edu.bd` OR `STU-2025-0001` | `Student@123`    | Class 9A, Roll 2025901 |

---

## 🔐 Authentication Flow

### Step 1 — Login

```http
POST /api/v1/auth/login
{ "username": "admin@school.edu.bd", "password": "Admin@123" }
```

Returns `accessToken` (15 min) + sets `refreshToken` httpOnly cookie (7 days).

### Step 2 — Authorize in Swagger

Click **Authorize 🔒** → enter `Bearer <accessToken>` under **bearerAuth**.

### First-Login Password Change

When `mustChangePassword: true` in login response:

```http
POST /api/v1/auth/change-password
Authorization: Bearer <accessToken>
{ "currentPassword": "TempPass@123", "newPassword": "MyNewPass@456" }
```

After this, full portal access is granted and new tokens are returned.

### Step 3 — Refresh Token

The `refreshToken` cookie is sent automatically by browser. Call:

```http
POST /api/v1/auth/refresh
# Cookie: refreshToken=<value> (sent automatically)
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── auth/               # JWT auth, mustChangePassword guard, OTP
│   ├── institution/        # School settings, principal message
│   ├── users/              # User accounts (super admin creates admin)
│   ├── classes/            # Sessions, classes, sections, subjects
│   ├── teachers/           # Teacher CRUD + class/section/subject assignment
│   ├── admissions/         # Public form → admin review → student creation
│   ├── students/           # Student management + promotion (StudentSession)
│   ├── attendance/         # Daily attendance, monthly report, calendar
│   ├── results/            # DRAFT → SUBMITTED → PUBLISHED marks workflow
│   ├── leave/              # Leave applications for students & teachers
│   ├── routine/            # Class timetable
│   ├── notices/            # Notice board (teacher publishes, admin manages)
│   ├── certificates/       # DRAFT → APPROVED → PUBLISHED → REVOKED
│   ├── gallery/            # Photo albums
│   ├── events/             # School events
│   ├── contact/            # Public contact form + admin inbox
│   ├── notifications/      # In-app notifications + Email/SMS
│   ├── audit/              # Audit logs (super admin only)
│   ├── prisma/             # PrismaService (global)
│   ├── common/             # Filters, interceptors, GPA utility
│   └── config/             # Typed configuration
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Initial data seeder
├── .env.example
└── package.json
```

---

## 🗄️ Key Workflows

### Admission → Student Account

```
Visitor submits form (POST /admissions)
        ↓ applicationNo returned
Admin reviews (GET /admissions)
        ↓
Admin approves (PUT /admissions/:id/approve)
        ↓
Student account created automatically
tempPassword returned (give to student)
        ↓
Student logs in → mustChangePassword = true
        ↓
Student changes password (POST /auth/change-password)
        ↓ Full portal access
```

### Mark Entry → Result Publication

```
Teacher enters marks (POST /results/marks)     → status: DRAFT
        ↓
Teacher submits (POST /results/marks/submit)   → status: SUBMITTED
        ↓
Admin publishes (PUT /results/marks/publish)   → status: PUBLISHED
        ↓
Students can view (GET /results/my-results)
Public search  (GET /results/search?roll=&examId=)
```

### Certificate Lifecycle

```
Admin creates  → DRAFT
Admin approves → APPROVED
Admin publishes→ PUBLISHED  ← student can view
Admin revokes  → REVOKED    ← hidden from student
```

---

## 📊 Bangladesh Grading System (JSC/SSC/HSC)

| Marks  | Grade | GPA  |
| ------ | ----- | ---- |
| 80–100 | A+    | 5.00 |
| 70–79  | A     | 4.00 |
| 60–69  | A-    | 3.50 |
| 50–59  | B     | 3.00 |
| 40–49  | C     | 2.00 |
| 33–39  | D     | 1.00 |
| 0–32   | F     | 0.00 |

Auto-calculated on mark entry. See `GET /results/grade-scale`.

---

## 🏷️ Role Permissions Summary

| Action              | SUPER_ADMIN | ADMIN | TEACHER | STUDENT |
| ------------------- | :---------: | :---: | :-----: | :-----: |
| Create Admin        |     ✅      |  ❌   |   ❌    |   ❌    |
| Manage Teachers     |     ✅      |  ✅   |   ❌    |   ❌    |
| Approve Admissions  |     ✅      |  ✅   |   ❌    |   ❌    |
| Take Attendance     |     ✅      |  ✅   |   ✅    |   ❌    |
| Enter Marks         |     ✅      |  ✅   |   ✅    |   ❌    |
| Publish Results     |     ✅      |  ✅   |   ❌    |   ❌    |
| View Own Results    |     ✅      |  ✅   |   ✅    |   ✅    |
| Create Certificates |     ✅      |  ✅   |   ❌    |   ❌    |
| View Audit Logs     |     ✅      |  ❌   |   ❌    |   ❌    |

---

## 🛠️ Useful Commands

```bash
npm run start:dev      # Development with hot-reload
npm run db:studio      # Prisma Studio GUI (http://localhost:5555)
npm run db:seed        # Re-seed initial data
npm run db:reset       # Reset DB + re-seed (⚠️ deletes all data)
npm run build          # Production build
```
