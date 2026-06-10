import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

/**
 * Multer memory storage — files stay in RAM (Buffer) and are
 * streamed directly to Cloudinary. Nothing is written to disk.
 */
export const multerMemoryStorage = memoryStorage();

/** Allowed MIME types for image uploads */
const IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

/** Allowed MIME types for document uploads (images + PDFs) */
const DOCUMENT_MIMES = [...IMAGE_MIMES, 'application/pdf'];

/**
 * File filter that only allows image files.
 * Use with FileInterceptor / FilesInterceptor for photo/image uploads.
 */
export const imageFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (IMAGE_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException(`Invalid file type: ${file.mimetype}. Only images are allowed.`), false);
  }
};

/**
 * File filter that allows images and PDF documents.
 * Use for admission documents, notice attachments, etc.
 */
export const documentFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (DOCUMENT_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException(`Invalid file type: ${file.mimetype}. Only images and PDFs are allowed.`), false);
  }
};

/** Default max file size in bytes (5 MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
