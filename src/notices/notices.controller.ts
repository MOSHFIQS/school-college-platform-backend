import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { NoticesService } from './notices.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NoticeCategory } from '@prisma/client';
import { multerMemoryStorage, documentFileFilter, MAX_FILE_SIZE } from '../cloudinary/multer.config';

@ApiTags('notices')
@Controller('notices')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class NoticesController {
  constructor(private readonly svc: NoticesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List public notices (public)', description: 'Paginated, non-expired notices sorted newest first. No auth required.' })
  @ApiQuery({ name: 'category', required: false, enum: NoticeCategory })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated notices' })
  findAll(
    @Query('category') category?: NoticeCategory,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) { return this.svc.findAll(category, search, page, limit); }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get notice detail (public)' })
  @ApiParam({ name: 'id', description: 'Notice CUID' })
  @ApiResponse({ status: 200, description: 'Notice detail' })
  @ApiResponse({ status: 404, description: 'Notice not found' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Get('admin/all')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all notices including private (admin)', description: 'Admin view — shows all notices including non-public ones.' })
  @ApiQuery({ name: 'category', required: false, enum: NoticeCategory })
  @ApiResponse({ status: 200, description: 'All notices' })
  adminFindAll(@Query('category') category?: NoticeCategory) { return this.svc.adminFindAll(category); }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Create notice (teacher/admin)', description: 'Teachers and admins can create notices. All notices are linked to the publishing teacher. Optionally upload an attachment.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Annual Sports Day' },
        body: { type: 'string', example: 'Annual sports day on Jan 25.' },
        category: { type: 'string', enum: Object.keys(NoticeCategory), example: 'ACADEMIC' },
        expiresAt: { type: 'string', example: '2025-01-25' },
        isPublic: { type: 'boolean', example: true },
        attachment: { type: 'string', format: 'binary', description: 'Notice attachment (image or PDF)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Notice created' })
  @UseInterceptors(FileInterceptor('attachment', { storage: multerMemoryStorage, fileFilter: documentFileFilter, limits: { fileSize: MAX_FILE_SIZE } }))
  create(
    @CurrentUser('id') userId: string,
    @Body() data: any,
    @UploadedFile() attachment?: Express.Multer.File,
  ) {
    return this.svc.create(data, userId, attachment);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Update notice', description: 'Teachers can only edit their own notices. Admins can edit any. Optionally upload/replace attachment.' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Notice CUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        category: { type: 'string', enum: Object.keys(NoticeCategory) },
        expiresAt: { type: 'string' },
        isPublic: { type: 'boolean' },
        attachment: { type: 'string', format: 'binary', description: 'Notice attachment (image or PDF)' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Notice updated' })
  @UseInterceptors(FileInterceptor('attachment', { storage: multerMemoryStorage, fileFilter: documentFileFilter, limits: { fileSize: MAX_FILE_SIZE } }))
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() data: any,
    @UploadedFile() attachment?: Express.Multer.File,
  ) {
    return this.svc.update(id, data, userId, ['SUPER_ADMIN', 'ADMIN'].includes(role), attachment);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Delete notice' })
  @ApiParam({ name: 'id', description: 'Notice CUID' })
  @ApiResponse({ status: 200, description: 'Notice deleted' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    return this.svc.remove(id, userId, ['SUPER_ADMIN', 'ADMIN'].includes(role));
  }
}
