import { BadRequestException } from '@nestjs/common';

export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGES_PER_REQUEST = 8;

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export interface ValidatedImageFile {
  buffer: Buffer;
  originalName: string;
  mimeType: AllowedMimeType;
  extension: '.jpg' | '.png' | '.webp';
  size: number;
}

/**
 * Validates the file buffer against known image magic numbers.
 * Returns the detected extension or null if unknown / invalid.
 */
export function detectImageSignature(buffer: Buffer): {
  mimeType: AllowedMimeType;
  extension: '.jpg' | '.png' | '.webp';
} | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // Check JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }

  // Check PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', extension: '.png' };
  }

  // Check WebP: RIFF (bytes 0-3: 52 49 46 46) ... WEBP (bytes 8-11: 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mimeType: 'image/webp', extension: '.webp' };
  }

  return null;
}

/**
 * Validates an uploaded file:
 * - Size limit (5 MB)
 * - Declared MIME type
 * - Actual binary signature (magic numbers)
 * - Rejects SVG, HTML, scripts, executables, corrupted files
 */
export function validateImageFile(file: {
  buffer?: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}): ValidatedImageFile {
  if (!file || !file.buffer) {
    throw new BadRequestException('No image file payload provided');
  }

  const size = file.size ?? file.buffer.length;
  if (size > MAX_IMAGE_FILE_SIZE) {
    throw new BadRequestException(
      `File "${file.originalname || 'unknown'}" exceeds the maximum allowed size of 5 MB`,
    );
  }

  if (size === 0) {
    throw new BadRequestException(
      `File "${file.originalname || 'unknown'}" is empty`,
    );
  }

  // Check declared MIME type
  const declaredMime = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(declaredMime as AllowedMimeType)) {
    throw new BadRequestException(
      `Unsupported file type "${file.mimetype}". Allowed formats: JPEG, PNG, WebP`,
    );
  }

  // Verify binary signature
  const detected = detectImageSignature(file.buffer);
  if (!detected) {
    throw new BadRequestException(
      `File "${file.originalname || 'unknown'}" has an invalid file signature. SVG, HTML, and non-image files are rejected.`,
    );
  }

  // Reject MIME type / signature mismatch
  if (
    (detected.mimeType === 'image/jpeg' && declaredMime !== 'image/jpeg') ||
    (detected.mimeType === 'image/png' && declaredMime !== 'image/png') ||
    (detected.mimeType === 'image/webp' && declaredMime !== 'image/webp')
  ) {
    throw new BadRequestException(
      `File "${file.originalname || 'unknown'}" content does not match its declared MIME type`,
    );
  }

  return {
    buffer: file.buffer,
    originalName: file.originalname || `upload${detected.extension}`,
    mimeType: detected.mimeType,
    extension: detected.extension,
    size,
  };
}

