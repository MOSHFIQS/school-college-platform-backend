import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { multerMemoryStorage, imageFileFilter, MAX_FILE_SIZE } from '../cloudinary/multer.config';

@ApiTags('events')
@Controller('events')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class EventsController {
  constructor(private readonly svc: EventsService) {}

  @Public() @Get()
  @ApiOperation({ summary: 'Get school events (public)', description: 'No auth required. Use `upcoming=true` to filter future events only.' })
  @ApiQuery({ name: 'upcoming', required: false, example: 'true' })
  @ApiResponse({ status: 200, description: 'Events list' })
  findAll(@Query('upcoming') upcoming?: string) { return this.svc.findAll(upcoming === 'true'); }

  @Public() @Get(':id')
  @ApiOperation({ summary: 'Get event detail (public)' })
  @ApiParam({ name: 'id', description: 'Event CUID' })
  @ApiResponse({ status: 200, description: 'Event detail' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create event (admin)', description: 'Create event with optional poster image upload.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { title: { type: 'string', example: 'Annual Sports Day' }, description: { type: 'string', example: 'Annual sports competition' }, eventDate: { type: 'string', example: '2025-01-25T09:00:00Z' }, endDate: { type: 'string', example: '2025-01-25T17:00:00Z' }, venue: { type: 'string', example: 'School Ground' }, isPublic: { type: 'boolean', example: true }, poster: { type: 'string', format: 'binary', description: 'Event poster image' } } } })
  @ApiResponse({ status: 201, description: 'Event created' })
  @UseInterceptors(FileInterceptor('poster', { storage: multerMemoryStorage, fileFilter: imageFileFilter, limits: { fileSize: MAX_FILE_SIZE } }))
  create(
    @CurrentUser('id') userId: string,
    @Body() data: any,
    @UploadedFile() poster?: Express.Multer.File,
  ) { return this.svc.create(data, userId, poster); }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update event (admin)', description: 'Update event. Optionally upload a new poster.' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Event CUID' })
  @ApiBody({ schema: { type: 'object', properties: { title: { type: 'string' }, venue: { type: 'string' }, poster: { type: 'string', format: 'binary', description: 'Event poster image' } } } })
  @ApiResponse({ status: 200, description: 'Event updated' })
  @UseInterceptors(FileInterceptor('poster', { storage: multerMemoryStorage, fileFilter: imageFileFilter, limits: { fileSize: MAX_FILE_SIZE } }))
  update(
    @Param('id') id: string,
    @Body() data: any,
    @UploadedFile() poster?: Express.Multer.File,
  ) { return this.svc.update(id, data, poster); }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete event (admin)' })
  @ApiParam({ name: 'id', description: 'Event CUID' })
  @ApiResponse({ status: 200, description: 'Event deleted' })
  delete(@Param('id') id: string) { return this.svc.delete(id); }
}
