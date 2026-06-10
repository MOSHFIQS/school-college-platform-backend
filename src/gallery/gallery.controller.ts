import {
  Controller, Get, Post, Delete, Body, Param,
  UseGuards, UseInterceptors, UploadedFile, UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { GalleryService } from './gallery.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { multerMemoryStorage, imageFileFilter, MAX_FILE_SIZE } from '../cloudinary/multer.config';

@ApiTags('gallery')
@Controller('gallery')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class GalleryController {
  constructor(private readonly svc: GalleryService) {}

  @Public() @Get()
  @ApiOperation({ summary: 'Get all albums (public)', description: 'Returns all photo albums with cover image and photo count. No auth required.' })
  @ApiResponse({ status: 200, description: 'Albums list' })
  getAlbums() { return this.svc.getAlbums(); }

  @Public() @Get(':id')
  @ApiOperation({ summary: 'Get album with photos (public)' })
  @ApiParam({ name: 'id', description: 'Album CUID' })
  @ApiResponse({ status: 200, description: 'Album with all photos' })
  @ApiResponse({ status: 404, description: 'Album not found' })
  getAlbum(@Param('id') id: string) { return this.svc.getAlbum(id); }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create photo album (admin)', description: 'Create album with optional cover image upload.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { name: { type: 'string', example: 'Annual Day 2025' }, description: { type: 'string', example: 'Photos from annual day' }, eventDate: { type: 'string', example: '2025-01-25' }, cover: { type: 'string', format: 'binary', description: 'Album cover image' } } } })
  @ApiResponse({ status: 201, description: 'Album created' })
  @UseInterceptors(FileInterceptor('cover', { storage: multerMemoryStorage, fileFilter: imageFileFilter, limits: { fileSize: MAX_FILE_SIZE } }))
  createAlbum(
    @CurrentUser('id') userId: string,
    @Body() data: any,
    @UploadedFile() cover?: Express.Multer.File,
  ) {
    return this.svc.createAlbum(data, userId, cover);
  }

  @Post(':id/photos')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Upload photos to album (admin)', description: 'Upload up to 20 photos at once to an album.' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Album CUID' })
  @ApiBody({ schema: { type: 'object', properties: { photos: { type: 'array', items: { type: 'string', format: 'binary' }, description: 'Photo files (max 20)' }, captions: { type: 'string', description: 'JSON array of captions matching each photo', example: '["Opening ceremony", "Prize giving"]' } } } })
  @ApiResponse({ status: 201, description: 'Photos added' })
  @UseInterceptors(FilesInterceptor('photos', 20, { storage: multerMemoryStorage, fileFilter: imageFileFilter, limits: { fileSize: MAX_FILE_SIZE } }))
  addPhotos(
    @Param('id') albumId: string,
    @UploadedFiles() photos: Express.Multer.File[],
    @Body('captions') captions?: string,
  ) {
    const parsedCaptions = captions ? JSON.parse(captions) : [];
    return this.svc.addPhotos(albumId, photos, parsedCaptions);
  }

  @Delete('photos/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete photo (admin)' })
  @ApiParam({ name: 'id', description: 'Photo CUID' })
  @ApiResponse({ status: 200, description: 'Photo deleted' })
  deletePhoto(@Param('id') id: string) { return this.svc.deletePhoto(id); }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete album with all photos (admin)' })
  @ApiParam({ name: 'id', description: 'Album CUID' })
  @ApiResponse({ status: 200, description: 'Album deleted' })
  deleteAlbum(@Param('id') id: string) { return this.svc.deleteAlbum(id); }
}
