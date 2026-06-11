import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  private readonly startedAt = new Date();

  constructor(private readonly prisma: PrismaService) {}

  // ── JSON health endpoint (for monitoring tools) ─────────────────────────
  @Get('health')
  async healthJson() {
    const now = new Date();
    const uptimeMs = now.getTime() - this.startedAt.getTime();
    const dbStatus = await this.checkDatabase();

    return {
      status: 'ok',
      health: 100,
      timestamp: now.toISOString(),
      uptime: this.formatUptime(uptimeMs),
      uptimeMs,
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      node: process.version,
      memory: this.getMemoryUsage(),
    };
  }

  // ── Beautiful HTML landing page at root ── ──────────────────────────────
  @Get()
  async root(@Res() res: Response) {
    const now = new Date();
    const uptimeMs = now.getTime() - this.startedAt.getTime();
    const dbStatus = await this.checkDatabase();
    const mem = this.getMemoryUsage();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BD School Portal — Server Status</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0a0a1a;
      background-image:
        radial-gradient(ellipse at 20% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 80%, rgba(244, 114, 182, 0.08) 0%, transparent 50%);
      color: #e2e8f0;
      padding: 2rem;
      overflow: hidden;
    }

    .container {
      max-width: 640px;
      width: 100%;
      animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulse-ring {
      0%   { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }

    .header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .logo-area {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      animation: float 4s ease-in-out infinite;
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      box-shadow: 0 0 30px rgba(99, 102, 241, 0.4);
    }

    .logo-text {
      font-size: 1.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #c7d2fe, #e0e7ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      color: #94a3b8;
      font-size: 0.9rem;
      font-weight: 500;
    }

    /* ── Status badge ── */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1.25rem;
      border-radius: 100px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-weight: 600;
      font-size: 0.85rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 2rem;
    }

    .status-dot {
      position: relative;
      width: 10px;
      height: 10px;
    }

    .status-dot::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: #34d399;
    }

    .status-dot::after {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      background: #34d399;
      animation: pulse-ring 1.5s ease-out infinite;
    }

    /* ── Glass card ── */
    .card {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 20px;
      padding: 2rem;
      margin-bottom: 1.25rem;
      transition: border-color 0.3s;
    }

    .card:hover {
      border-color: rgba(255, 255, 255, 0.12);
    }

    .card-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #64748b;
      margin-bottom: 1.25rem;
    }

    /* ── Health gauge ── */
    .gauge-container {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .gauge {
      position: relative;
      width: 100px;
      height: 100px;
      flex-shrink: 0;
    }

    .gauge svg {
      transform: rotate(-90deg);
      width: 100px;
      height: 100px;
    }

    .gauge-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.06);
      stroke-width: 8;
    }

    .gauge-fill {
      fill: none;
      stroke: url(#gauge-gradient);
      stroke-width: 8;
      stroke-linecap: round;
      stroke-dasharray: 283;
      stroke-dashoffset: 0;
      transition: stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .gauge-value {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      font-weight: 800;
      color: #34d399;
    }

    .gauge-value span {
      font-size: 0.65rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .gauge-info {
      flex: 1;
    }

    .gauge-info h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #e2e8f0;
      margin-bottom: 0.25rem;
    }

    .gauge-info p {
      font-size: 0.85rem;
      color: #94a3b8;
      line-height: 1.5;
    }

    /* ── Metric rows ── */
    .metrics {
      display: grid;
      gap: 0;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .metric-row:last-child { border-bottom: none; }

    .metric-label {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .metric-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      background: rgba(255, 255, 255, 0.04);
    }

    .metric-value {
      font-size: 0.85rem;
      font-weight: 600;
      color: #e2e8f0;
      font-variant-numeric: tabular-nums;
    }

    .metric-value.green  { color: #34d399; }
    .metric-value.blue   { color: #60a5fa; }
    .metric-value.purple { color: #a78bfa; }
    .metric-value.amber  { color: #fbbf24; }

    /* ── Quick links ── */
    .links {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .link-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 1.1rem;
      border-radius: 12px;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .link-btn:hover {
      background: rgba(99, 102, 241, 0.2);
      border-color: rgba(99, 102, 241, 0.4);
      transform: translateY(-1px);
    }

    .footer {
      text-align: center;
      margin-top: 2rem;
      font-size: 0.75rem;
      color: #475569;
    }

    @media (max-width: 480px) {
      .gauge-container { flex-direction: column; text-align: center; }
      .links { justify-content: center; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-area">
        <div class="logo-icon">🏫</div>
        <div class="logo-text">BD School Portal</div>
      </div>
      <p class="subtitle">Bangladesh School / College Management System — API Server</p>
    </div>

    <div style="text-align:center">
      <div class="status-badge">
        <div class="status-dot"></div>
        All Systems Operational
      </div>
    </div>

    <!-- Health Gauge -->
    <div class="card">
      <div class="card-title">System Health</div>
      <div class="gauge-container">
        <div class="gauge">
          <svg viewBox="0 0 100 100">
            <defs>
              <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#10b981"/>
                <stop offset="100%" stop-color="#34d399"/>
              </linearGradient>
            </defs>
            <circle class="gauge-bg" cx="50" cy="50" r="45"/>
            <circle class="gauge-fill" cx="50" cy="50" r="45"/>
          </svg>
          <div class="gauge-value">
            100
            <span>Health</span>
          </div>
        </div>
        <div class="gauge-info">
          <h3>Server Running Perfectly</h3>
          <p>All services are healthy, database is connected, and the API is ready to accept requests.</p>
        </div>
      </div>
    </div>

    <!-- Server Metrics -->
    <div class="card">
      <div class="card-title">Server Metrics</div>
      <div class="metrics">
        <div class="metric-row">
          <div class="metric-label">
            <div class="metric-icon">⏱️</div>
            Uptime
          </div>
          <div class="metric-value green">${this.formatUptime(uptimeMs)}</div>
        </div>
        <div class="metric-row">
          <div class="metric-label">
            <div class="metric-icon">🗄️</div>
            Database
          </div>
          <div class="metric-value ${dbStatus.connected ? 'green' : 'amber'}">${dbStatus.connected ? '● Connected' : '○ Disconnected'} ${dbStatus.latencyMs !== null ? '(' + dbStatus.latencyMs + 'ms)' : ''}</div>
        </div>
        <div class="metric-row">
          <div class="metric-label">
            <div class="metric-icon">🌐</div>
            Environment
          </div>
          <div class="metric-value purple">${process.env.NODE_ENV || 'development'}</div>
        </div>
        <div class="metric-row">
          <div class="metric-label">
            <div class="metric-icon">📦</div>
            Node.js
          </div>
          <div class="metric-value blue">${process.version}</div>
        </div>
        <div class="metric-row">
          <div class="metric-label">
            <div class="metric-icon">💾</div>
            Memory (Heap)
          </div>
          <div class="metric-value blue">${mem.heapUsed} / ${mem.heapTotal}</div>
        </div>
        <div class="metric-row">
          <div class="metric-label">
            <div class="metric-icon">📊</div>
            RSS Memory
          </div>
          <div class="metric-value blue">${mem.rss}</div>
        </div>
        <div class="metric-row">
          <div class="metric-label">
            <div class="metric-icon">🕐</div>
            Server Time
          </div>
          <div class="metric-value">${now.toISOString()}</div>
        </div>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="card">
      <div class="card-title">Quick Links</div>
      <div class="links">
        <a class="link-btn" href="/api/docs">📚 API Docs</a>
        <a class="link-btn" href="/health">💚 Health JSON</a>
        <a class="link-btn" href="/api/v1/auth/login" style="pointer-events:none;opacity:.5">🔐 Login</a>
      </div>
    </div>

    <div class="footer">
      BD School/College Portal API v1.0.0 &nbsp;·&nbsp; NestJS + Prisma + PostgreSQL
    </div>
  </div>
</body>
</html>`;

    res.type('html').send(html);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  private async checkDatabase(): Promise<{ connected: boolean; latencyMs: number | null }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { connected: true, latencyMs: Date.now() - start };
    } catch {
      return { connected: false, latencyMs: null };
    }
  }

  private formatUptime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${sec}s`);
    return parts.join(' ');
  }

  private getMemoryUsage() {
    const mem = process.memoryUsage();
    const fmt = (b: number) => (b / 1024 / 1024).toFixed(1) + ' MB';
    return {
      rss: fmt(mem.rss),
      heapTotal: fmt(mem.heapTotal),
      heapUsed: fmt(mem.heapUsed),
      external: fmt(mem.external),
    };
  }
}
