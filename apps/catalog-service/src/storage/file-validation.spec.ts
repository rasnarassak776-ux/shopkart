import { BadRequestException } from '@nestjs/common';
import {
  detectImageSignature,
  validateImageFile,
  MAX_IMAGE_FILE_SIZE,
} from './file-validation';

describe('file-validation', () => {
  // Valid magic byte buffers
  const validJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const validPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const validWebp = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);

  describe('detectImageSignature', () => {
    it('detects JPEG magic numbers', () => {
      const result = detectImageSignature(validJpeg);
      expect(result).toEqual({ mimeType: 'image/jpeg', extension: '.jpg' });
    });

    it('detects PNG magic numbers', () => {
      const result = detectImageSignature(validPng);
      expect(result).toEqual({ mimeType: 'image/png', extension: '.png' });
    });

    it('detects WebP magic numbers', () => {
      const result = detectImageSignature(validWebp);
      expect(result).toEqual({ mimeType: 'image/webp', extension: '.webp' });
    });

    it('rejects buffers shorter than 12 bytes', () => {
      expect(detectImageSignature(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
    });

    it('rejects SVG text files', () => {
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      expect(detectImageSignature(svg)).toBeNull();
    });

    it('rejects HTML files', () => {
      const html = Buffer.from('<!DOCTYPE html><html><body></body></html>');
      expect(detectImageSignature(html)).toBeNull();
    });

    it('rejects executable files (MZ header)', () => {
      const exe = Buffer.from([
        0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
      ]);
      expect(detectImageSignature(exe)).toBeNull();
    });
  });

  describe('validateImageFile', () => {
    it('accepts valid JPEG file', () => {
      const result = validateImageFile({
        buffer: validJpeg,
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: validJpeg.length,
      });
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.extension).toBe('.jpg');
    });

    it('accepts valid PNG file', () => {
      const result = validateImageFile({
        buffer: validPng,
        originalname: 'graphic.png',
        mimetype: 'image/png',
        size: validPng.length,
      });
      expect(result.mimeType).toBe('image/png');
      expect(result.extension).toBe('.png');
    });

    it('accepts valid WebP file', () => {
      const result = validateImageFile({
        buffer: validWebp,
        originalname: 'banner.webp',
        mimetype: 'image/webp',
        size: validWebp.length,
      });
      expect(result.mimeType).toBe('image/webp');
      expect(result.extension).toBe('.webp');
    });

    it('rejects files larger than 5 MB', () => {
      expect(() =>
        validateImageFile({
          buffer: validJpeg,
          originalname: 'huge.jpg',
          mimetype: 'image/jpeg',
          size: MAX_IMAGE_FILE_SIZE + 1,
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects empty 0-byte files', () => {
      expect(() =>
        validateImageFile({
          buffer: Buffer.alloc(0),
          originalname: 'empty.jpg',
          mimetype: 'image/jpeg',
          size: 0,
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects unsupported declared MIME types (e.g. image/gif)', () => {
      expect(() =>
        validateImageFile({
          buffer: validJpeg,
          originalname: 'anim.gif',
          mimetype: 'image/gif',
          size: validJpeg.length,
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects MIME type and magic number mismatch (e.g. PNG declared as JPEG)', () => {
      expect(() =>
        validateImageFile({
          buffer: validPng,
          originalname: 'fake.jpg',
          mimetype: 'image/jpeg',
          size: validPng.length,
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects SVG disguised as image/png', () => {
      const fakeSvg = Buffer.from('<svg width="100" height="100"></svg>');
      expect(() =>
        validateImageFile({
          buffer: fakeSvg,
          originalname: 'vector.png',
          mimetype: 'image/png',
          size: fakeSvg.length,
        }),
      ).toThrow(BadRequestException);
    });
  });
});

