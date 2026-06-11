import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CertificateType } from '@prisma/client';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export class CreateCertificateDto {
  @ApiProperty({ description: 'Student CUID' })
  @IsString()
  studentId: string;

  @ApiProperty({ enum: CertificateType })
  @IsEnum(CertificateType)
  type: CertificateType;

  @ApiProperty({ description: 'Title of the certificate' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Certificate body / description text' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Upload a PDF or image of the certificate' })
  @IsOptional()
  file?: any;
}
