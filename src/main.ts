import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  const cfg = app.get(ConfigService);
  const isProd = cfg.get('nodeEnv') === 'production';

  // ── Security ───────────────────────────────────────────────────────────────
  app.use(helmet({ contentSecurityPolicy: isProd ? undefined : false }));
  app.use(cookieParser());

  // ── CORS — credentials=true so browser sends httpOnly cookies to Swagger ──
  app.enableCors({
    origin: cfg.get('frontendUrl'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global prefix ──────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation ─────────────────────────────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // ── Global filters & interceptors ──────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── Swagger ────────────────────────────────────────────────────────────────
  if (!isProd) {
    const swaggerCfg = new DocumentBuilder()
      .setTitle('BD School/College Portal API')
      .setDescription(
        `## Bangladesh School/College Management System\n\n` +
        `### 🔐 How to Authenticate\n\n` +
        `**Step 1 — Login:**\n` +
        `> \`POST /api/v1/auth/login\` → copy \`accessToken\` from the response\n\n` +
        `**Step 2 — Authorize in Swagger:**\n` +
        `> Click **Authorize 🔒** (top right) → paste \`Bearer <accessToken>\` under **bearerAuth**\n\n` +
        `**Step 3 — Cookie (auto):**\n` +
        `> The \`refreshToken\` httpOnly cookie is set automatically by the browser after login.\n` +
        `> Swagger sends it automatically with \`withCredentials: true\`.\n` +
        `> To use cookie auth in Swagger, also click **Authorize 🔒** → enter anything under **cookieAuth**.\n\n` +
        `### ⚠️ First Login\n\n` +
        `When \`mustChangePassword = true\` in the login response, you **must** call \`POST /auth/change-password\` ` +
        `before accessing any other protected route. All other routes will return **403 Forbidden** until the password is changed.\n\n` +
        `### 👥 Roles\n` +
        `| Role | Access |\n` +
        `|------|--------|\n` +
        `| \`SUPER_ADMIN\` | Full system access, audit logs, create admins |\n` +
        `| \`ADMIN\` | Students, teachers, academic management |\n` +
        `| \`TEACHER\` | Attendance, marks entry, notices |\n` +
        `| \`STUDENT\` | View own data, results, certificates |`,
      )
      .setVersion('1.0.0')
      .setContact('BD School Portal', 'https://school.edu.bd', 'admin@school.edu.bd')
      // ── Bearer token scheme ────────────────────────────────────────────────
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter: Bearer <accessToken from /auth/login>',
          in: 'header',
        },
        'bearerAuth',
      )
      // ── Cookie scheme ──────────────────────────────────────────────────────
      .addCookieAuth(
        'refreshToken',
        {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'httpOnly refreshToken cookie — set automatically on login. Browser sends it with withCredentials:true.',
        },
        'cookieAuth',
      )
      .addTag('auth',          '🔐 Authentication — Login, logout, change/reset password')
      .addTag('institution',   '🏫 Institution — Settings, principal message')
      .addTag('users',         '👤 User Accounts — Create admin, activate/deactivate')
      .addTag('classes',       '📚 Classes, Sections, Subjects & Academic Sessions')
      .addTag('teachers',      '👨‍🏫 Teacher Management')
      .addTag('admissions',    '📝 Admissions — Public form, review, approve → create student')
      .addTag('students',      '🎓 Student Management & Promotions')
      .addTag('attendance',    '📋 Attendance — Daily entry, monthly reports, calendar')
      .addTag('results',       '📊 Results — DRAFT → SUBMITTED → PUBLISHED workflow')
      .addTag('leave',         '🏖️ Leave Applications — Students & Teachers')
      .addTag('routine',       '🕐 Class Timetable / Routine')
      .addTag('notices',       '📢 Notice Board')
      .addTag('certificates',  '🏆 Certificates — DRAFT → APPROVED → PUBLISHED → REVOKED')
      .addTag('gallery',       '🖼️ Photo Gallery & Albums')
      .addTag('events',        '🎉 School Events')
      .addTag('contact',       '✉️ Contact Messages — Public form & Admin inbox')
      .addTag('notifications', '🔔 In-App Notifications')
      .addTag('audit',         '🔍 Audit Logs — Super Admin only')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerCfg);

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,   // keep token across page reload
        tryItOutEnabled:       true,   // open "Try it out" by default
        withCredentials:       true,   // send cookies automatically
        docExpansion:         'none',  // collapsed tags by default
        filter:                true,
        showRequestDuration:   true,
        tagsSorter:           'alpha',
      },
      customSiteTitle: 'BD School Portal — API Docs',
    });

    const port = cfg.get('port') || 3000;
    console.log(`\n📚 Swagger UI  → http://localhost:${port}/api/docs`);
    console.log(`🏫 API Base    → http://localhost:${port}/api/v1\n`);
  }

  const port = cfg.get('port') || 3000;
  await app.listen(port);
  console.log(`✅ Server running on port ${port}`);
}

bootstrap();
