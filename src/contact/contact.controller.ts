import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('contact')
@Controller('contact')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class ContactController {
  constructor(private readonly svc: ContactService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Send contact message (public)', description: 'Public visitors can send messages. No auth required. Appears in admin inbox.' })
  @ApiBody({ schema: { example: { name: 'Md. Rahim', email: 'rahim@gmail.com', phone: '01700000001', subject: 'Admission Query', message: 'When does admission start?', type: 'general' } } })
  @ApiResponse({ status: 201, description: 'Message sent' })
  send(@Body() data: any) { return this.svc.send(data); }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List contact messages (admin)', description: 'Admin inbox. Filter by read/unread status.' })
  @ApiQuery({ name: 'isRead', required: false, enum: ['true', 'false'], description: 'Filter by read status' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Contact messages' })
  findAll(
    @Query('isRead') isRead?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    const read = isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    return this.svc.findAll(read, page, limit);
  }

  @Put(':id/read')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Mark message as read / replied (admin)' })
  @ApiParam({ name: 'id', description: 'Message CUID' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  markRead(@Param('id') id: string) { return this.svc.markRead(id); }
}
