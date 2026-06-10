import { Controller, Get, Put, Body, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { InstitutionService } from './institution.service';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { multerMemoryStorage, imageFileFilter, MAX_FILE_SIZE } from '../cloudinary/multer.config';

@ApiTags('institution')
@Controller('institution')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class InstitutionController {
  constructor(private readonly svc: InstitutionService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get institution info (public)',
    description: 'Returns name, logo, EIIN, address, and principal message. No auth required — used on public website homepage.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        data: {
          name: 'Dhaka Model High School', nameBn: 'ঢাকা মডেল উচ্চ বিদ্যালয়',
          eiin: '108234', address: '123 School Road, Dhaka-1205',
          principalName: 'Dr. Abdur Rahim', principalMessage: 'Welcome to our institution...',
          logoUrl: 'https://res.cloudinary.com/.../logo.png', established: 1965,
        },
      },
    },
  })
  get() { return this.svc.get(); }

  @Put()
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Update institution settings (Super Admin only)',
    description: 'Creates or updates the single institution configuration record. Optionally upload logo and principal photo.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Dhaka Model High School' },
        nameBn: { type: 'string', example: 'ঢাকা মডেল উচ্চ বিদ্যালয়' },
        address: { type: 'string', example: '123 School Road, Dhaka' },
        phone: { type: 'string', example: '02-9876543' },
        email: { type: 'string', example: 'info@school.edu.bd' },
        website: { type: 'string', example: 'https://school.edu.bd' },
        eiin: { type: 'string', example: '108234' },
        principalName: { type: 'string', example: 'Dr. Abdur Rahim' },
        principalMessage: { type: 'string', example: 'Welcome to our institution.' },
        established: { type: 'number', example: 1965 },
        logo: { type: 'string', format: 'binary', description: 'Institution logo' },
        principalPhoto: { type: 'string', format: 'binary', description: 'Principal photo' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Settings saved' })
  @UseInterceptors(FileFieldsInterceptor(
    [{ name: 'logo', maxCount: 1 }, { name: 'principalPhoto', maxCount: 1 }],
    { storage: multerMemoryStorage, fileFilter: imageFileFilter, limits: { fileSize: MAX_FILE_SIZE } },
  ))
  upsert(
    @Body() data: any,
    @UploadedFiles() files?: { logo?: Express.Multer.File[]; principalPhoto?: Express.Multer.File[] },
  ) {
    return this.svc.upsert(data, files?.logo?.[0], files?.principalPhoto?.[0]);
  }
}
