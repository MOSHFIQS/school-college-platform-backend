import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    cloudinary.config({
      cloud_name: this.config.get<string>('cloudinary.cloudName'),
      api_key: this.config.get<string>('cloudinary.apiKey'),
      api_secret: this.config.get<string>('cloudinary.apiSecret'),
    });
    this.logger.log('Cloudinary SDK configured');
  }

  /**
   * Upload a single file to Cloudinary.
   * @param file  - multer file (memory storage → file.buffer)
   * @param folder - Cloudinary folder e.g. "school-portal/gallery"
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<CloudinaryUploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          transformation: file.mimetype.startsWith('image/')
            ? [{ quality: 'auto', fetch_format: 'auto' }]
            : undefined,
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            return reject(new BadRequestException(`Upload failed: ${error.message}`));
          }
          if (!result) {
            return reject(new BadRequestException('Upload failed: no result returned'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload multiple files to Cloudinary.
   * @param files  - array of multer files
   * @param folder - Cloudinary folder
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<CloudinaryUploadResult[]> {
    if (!files || files.length === 0) return [];
    return Promise.all(files.map(f => this.uploadFile(f, folder)));
  }

  /**
   * Delete a file from Cloudinary by its public ID.
   */
  async deleteFile(publicId: string): Promise<void> {
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Deleted from Cloudinary: ${publicId}`);
    } catch (err) {
      this.logger.warn(`Failed to delete from Cloudinary: ${publicId}`, err);
    }
  }

  /**
   * Delete multiple files from Cloudinary.
   */
  async deleteFiles(publicIds: string[]): Promise<void> {
    if (!publicIds || publicIds.length === 0) return;
    await Promise.allSettled(publicIds.map(id => this.deleteFile(id)));
  }

  /**
   * Extract the public ID from a Cloudinary URL.
   * e.g. "https://res.cloudinary.com/demo/image/upload/v123/school-portal/gallery/abc.jpg"
   *  → "school-portal/gallery/abc"
   */
  extractPublicId(url: string): string | null {
    if (!url || !url.includes('cloudinary.com')) return null;
    try {
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;
      // Remove version prefix (v123456789/) and file extension
      const pathWithVersion = parts[1];
      const withoutVersion = pathWithVersion.replace(/^v\d+\//, '');
      return withoutVersion.replace(/\.[^.]+$/, '');
    } catch {
      return null;
    }
  }
}
