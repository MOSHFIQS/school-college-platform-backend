import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('smtp.host'), port: config.get('smtp.port'),
      secure: false, auth: { user: config.get('smtp.user'), pass: config.get('smtp.pass') },
    });
  }

  async sendEmail(to: string | string[], subject: string, text: string, html?: string) {
    if (!this.config.get('smtp.user')) { this.logger.warn('SMTP not configured'); return false; }
    try {
      await this.transporter.sendMail({ from: `"BD School Portal" <${this.config.get('smtp.from')}>`, to: Array.isArray(to) ? to.join(',') : to, subject, text, html });
      return true;
    } catch (e) { this.logger.error('Email failed', e.message); return false; }
  }

  async sendSms(phone: string, message: string) {
    // SSL Wireless integration placeholder
    this.logger.log(`SMS to ${phone}: ${message.substring(0, 50)}...`);
    return true;
  }

  async create(userId: string, title: string, body: string, type: string, metadata?: any) {
    const link = metadata?.link || null;
    return this.prisma.notification.create({ data: { userId, title, body, type, link } });
  }

  async bulkCreate(userIds: string[], title: string, body: string, type: string) {
    return this.prisma.notification.createMany({ data: userIds.map(userId => ({ userId, title, body, type })) });
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, total, unread, page, limit };
  }

  async markRead(userId: string, notificationId?: string) {
    if (notificationId) {
      return this.prisma.notification.update({ where: { id: notificationId }, data: { isRead: true, readAt: new Date() } });
    }
    return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
  }
}
