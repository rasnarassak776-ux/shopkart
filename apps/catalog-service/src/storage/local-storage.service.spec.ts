import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findMonorepoRoot, LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let tempDir: string;

  beforeAll(() => {
    // Create an isolated temporary test directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shopkart-test-upload-'));
  });

  afterAll(() => {
    // Clean up temporary test directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'CATALOG_UPLOAD_DIR') return tempDir;
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new LocalStorageService(configService);
    service.onModuleInit();
  });

  it('initializes and uses the isolated test directory', () => {
    expect(service.getUploadDirectory()).toBe(path.normalize(tempDir));
    expect(fs.existsSync(tempDir)).toBe(true);
  });

  it('saves file and returns unique server-side filename and relative URL', async () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const result = await service.saveFile({
      buffer,
      originalName: 'user-uploaded-filename.jpg',
      mimeType: 'image/jpeg',
    });

    expect(result.filename).toMatch(/^[a-f0-9-]+\.jpg$/);
    expect(result.url).toBe(`/api/v1/catalog/images/${result.filename}`);
    expect(result.size).toBe(buffer.length);

    // Verify file actually exists in the isolated temp directory
    const savedPath = path.join(tempDir, result.filename);
    expect(fs.existsSync(savedPath)).toBe(true);
    expect(fs.readFileSync(savedPath)).toEqual(buffer);
  });

  it('generates distinct filenames for consecutive uploads of identical original names', async () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const res1 = await service.saveFile({
      buffer,
      originalName: 'photo.png',
      mimeType: 'image/png',
    });
    const res2 = await service.saveFile({
      buffer,
      originalName: 'photo.png',
      mimeType: 'image/png',
    });

    expect(res1.filename).not.toBe(res2.filename);
  });

  it('correctly reports fileExists', async () => {
    const buffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    const { filename } = await service.saveFile({
      buffer,
      originalName: 'sample.webp',
      mimeType: 'image/webp',
    });

    expect(await service.fileExists(filename)).toBe(true);
    expect(await service.fileExists('non-existent-file-id.jpg')).toBe(false);
  });

  it('deletes an existing file safely', async () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const { filename } = await service.saveFile({
      buffer,
      originalName: 'to-delete.jpg',
      mimeType: 'image/jpeg',
    });

    expect(await service.fileExists(filename)).toBe(true);
    const deleted = await service.deleteFile(filename);
    expect(deleted).toBe(true);
    expect(await service.fileExists(filename)).toBe(false);
  });

  describe('Path Traversal & Security Rejections', () => {
    it('rejects path traversal with parent directory markers (..)', () => {
      expect(() => service.assertSafeFilename('../secret.jpg')).toThrow(BadRequestException);
      expect(() => service.assertSafeFilename('../../etc/passwd.jpg')).toThrow(BadRequestException);
      expect(() => service.assertSafeFilename('..\\..\\windows\\system32.jpg')).toThrow(BadRequestException);
    });

    it('rejects slashes and backslashes in filename', () => {
      expect(() => service.assertSafeFilename('subfolder/image.png')).toThrow(BadRequestException);
      expect(() => service.assertSafeFilename('subfolder\\image.png')).toThrow(BadRequestException);
    });

    it('rejects non-whitelisted extensions (e.g. .exe, .sh, .svg, .html)', () => {
      expect(() => service.assertSafeFilename('malicious.exe')).toThrow(BadRequestException);
      expect(() => service.assertSafeFilename('script.sh')).toThrow(BadRequestException);
      expect(() => service.assertSafeFilename('vector.svg')).toThrow(BadRequestException);
      expect(() => service.assertSafeFilename('page.html')).toThrow(BadRequestException);
    });

    it('rejects empty or whitespace filename', () => {
      expect(() => service.assertSafeFilename('')).toThrow(BadRequestException);
      expect(() => service.assertSafeFilename('   ')).toThrow(BadRequestException);
    });
  });

  describe('Monorepo Root & Storage Directory Resolution', () => {
    it('finds monorepo root reliably from monorepo root and workspace subdirectories', () => {
      const root = findMonorepoRoot(process.cwd());
      expect(fs.existsSync(path.join(root, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'database', 'prisma', 'schema.prisma'))).toBe(true);

      // Verify that starting from apps/catalog-service resolves to the same root
      const workspaceDir = path.join(root, 'apps', 'catalog-service');
      const rootFromWorkspace = findMonorepoRoot(workspaceDir);
      expect(rootFromWorkspace).toBe(root);

      // Verify that starting from a deep subfolder resolves to the same root
      const deepDir = path.join(root, 'apps', 'catalog-service', 'src', 'storage');
      const rootFromDeep = findMonorepoRoot(deepDir);
      expect(rootFromDeep).toBe(root);
    });

    it('resolves relative CATALOG_UPLOAD_DIR to the exact same absolute path regardless of cwd', () => {
      const root = findMonorepoRoot(process.cwd());
      const expectedPath = path.resolve(root, 'storage/product-images');

      const mockConfig = {
        get: jest.fn().mockReturnValue('storage/product-images'),
      } as unknown as ConfigService;

      // Mock cwd as root
      const originalCwd = process.cwd;
      try {
        process.cwd = jest.fn().mockReturnValue(root);
        const svcRoot = new LocalStorageService(mockConfig);
        expect(svcRoot.getUploadDirectory()).toBe(expectedPath);

        // Mock cwd as apps/catalog-service
        process.cwd = jest.fn().mockReturnValue(path.join(root, 'apps', 'catalog-service'));
        const svcWorkspace = new LocalStorageService(mockConfig);
        expect(svcWorkspace.getUploadDirectory()).toBe(expectedPath);
      } finally {
        process.cwd = originalCwd;
      }
    });

    it('respects absolute CATALOG_UPLOAD_DIR without prepending monorepo root', () => {
      const absoluteCustomDir = path.normalize('C:/shopkart-custom-storage');
      const mockConfig = {
        get: jest.fn().mockReturnValue(absoluteCustomDir),
      } as unknown as ConfigService;

      const svc = new LocalStorageService(mockConfig);
      expect(svc.getUploadDirectory()).toBe(absoluteCustomDir);
    });
  });
});

