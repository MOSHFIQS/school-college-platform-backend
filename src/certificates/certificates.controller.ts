import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { JwtAuthGuard, RolesGuard, MustChangePasswordGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CertificateStatus } from '@prisma/client';

@ApiTags('certificates')
@Controller('certificates')
@UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard)
@ApiBearerAuth('bearerAuth')
export class CertificatesController {
  constructor(
    private readonly svc: CertificatesService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get('my-certificates')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'My published certificates (student)', description: 'Students can only view PUBLISHED certificates. Cannot see DRAFT/APPROVED/REVOKED.' })
  @ApiResponse({ status: 200, description: 'Published certificates list' })
  async studentView(@CurrentUser('id') userId: string) {
    const student = await this.svc['prisma'].student.findUnique({ where: { userId } });
    return this.svc.studentView(student?.id || '');
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all certificates (admin)', description: 'Admin can filter by student or status.' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: CertificateStatus })
  @ApiResponse({ status: 200, description: 'Certificate list' })
  findAll(@Query('studentId') studentId?: string, @Query('status') status?: CertificateStatus) {
    return this.svc.findAll(studentId, status);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get certificate detail (admin)' })
  @ApiParam({ name: 'id', description: 'Certificate CUID' })
  @ApiResponse({ status: 200, description: 'Certificate detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create certificate (admin)', description: 'Creates a DRAFT certificate for a student. Must be approved then published before student can see it.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({ type: CreateCertificateDto })
  @ApiResponse({ status: 201, description: 'Certificate created as DRAFT' })
  async create(
    @CurrentUser('id') adminId: string, 
    @Body() data: CreateCertificateDto,
    @UploadedFile() file?: Express.Multer.File
  ) { 
    let pdfUrl = null;
    if (file) {
      const upload = await this.cloudinary.uploadFile(file, 'school-portal/certificates');
      pdfUrl = upload.url;
    }
    return this.svc.create(adminId, { ...data, pdfUrl }); 
  }

  @Put(':id/approve')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Approve certificate (admin)', description: 'DRAFT → APPROVED. Must be published separately.' })
  @ApiParam({ name: 'id', description: 'Certificate CUID' })
  @ApiResponse({ status: 200, description: 'Certificate approved' })
  approve(@Param('id') id: string, @CurrentUser('id') adminId: string) { return this.svc.approve(id, adminId); }

  @Put(':id/publish')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Publish certificate → visible to student (admin)', description: 'APPROVED → PUBLISHED. Students can now view and download.' })
  @ApiParam({ name: 'id', description: 'Certificate CUID' })
  @ApiResponse({ status: 200, description: 'Certificate published' })
  @ApiResponse({ status: 403, description: 'Must be approved first' })
  publish(@Param('id') id: string) { return this.svc.publish(id); }

  @Put(':id/revoke')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Revoke certificate (admin)', description: 'Revokes a published certificate. Student can no longer see it.' })
  @ApiParam({ name: 'id', description: 'Certificate CUID' })
  @ApiBody({ schema: { example: { revokeNote: 'Issued in error — wrong student details' } } })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  revoke(@Param('id') id: string, @Body('revokeNote') note: string) { return this.svc.revoke(id, note); }
}
