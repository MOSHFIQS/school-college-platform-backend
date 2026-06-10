import { Controller, Get, Put, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard)
@ApiBearerAuth('bearerAuth')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications', description: 'Paginated in-app notifications for the logged-in user with unread count.' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, schema: { example: { data: { items: [{ id: 'cuid', title: 'Result Published', body: 'Half-Yearly results are available', type: 'result', isRead: false, createdAt: '2025-06-01T08:00:00Z' }], total: 15, unread: 3 } } } })
  getAll(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) { return this.svc.getForUser(userId, page, limit); }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked read' })
  markAllRead(@CurrentUser('id') userId: string) { return this.svc.markRead(userId); }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  @ApiParam({ name: 'id', description: 'Notification CUID' })
  @ApiResponse({ status: 200, description: 'Notification marked read' })
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.svc.markRead(userId, id);
  }
}
