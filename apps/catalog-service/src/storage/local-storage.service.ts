import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  StorageService,
  StoredFileInput,
  StoredFileResult,
} from './storage.interface';

const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i;

/**
 * Locates the monorepo root by walking up from the current directory or startDir
 * until finding stable repository root markers (package.json with workspaces and database/prisma/schema.prisma).
 */
export function findMonorepoRoot(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);
  while (true) {
    const pkgPath = path.join(current, 'package.json');
    const schemaPath = path.join(current, 'database', 'prisma', 'schema.prisma');
    if (fs.existsSync(pkgPath) && fs.existsSync(schemaPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.workspaces) {
          return current;
        }
      } catch {
        // Continue walking up if reading/parsing fails
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      // Reached filesystem root without finding markers, fallback to startDir
      return path.resolve(startDir);
    }
    current = parent;
  }
}

@Injectable()
export class LocalStorageService implements StorageService, OnModuleInit {
  private readonly logger = new Logger(LocalStorageService.name);
  private uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    const configuredDir =
      this.configService.get<string>('CATALOG_UPLOAD_DIR') ||
      process.env.CATALOG_UPLOAD_DIR ||
      'storage/product-images';

    if (path.isAbsolute(configuredDir)) {
      this.uploadDir = path.normalize(configuredDir);
    } else {
      const monorepoRoot = findMonorepoRoot(process.cwd());
      this.uploadDir = path.resolve(monorepoRoot, configuredDir);
    }
  }

  onModuleInit() {
    this.ensureUploadDirectory();
  }

  /** Expose configured upload directory for inspection or testing */
  getUploadDirectory(): string {
    return this.uploadDir;
  }

  /** Ensure upload directory exists */
  private ensureUploadDirectory() {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        this.logger.log(`Created product image storage directory: ${this.uploadDir}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create upload directory at ${this.uploadDir}`,
        error,
      );
    }
  }

  /**
   * Validates that the requested filename is strictly safe and cannot escape
   * the designated storage directory.
   */
  assertSafeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      throw new BadRequestException('Invalid filename provided');
    }

    const trimmed = filename.trim();
    if (!SAFE_FILENAME_REGEX.test(trimmed)) {
      throw new BadRequestException(
        'Invalid filename. Path traversal characters and non-whitelisted extensions are forbidden.',
      );
    }

    const resolved = path.resolve(this.uploadDir, trimmed);
    const normalizedUploadDir = path.resolve(this.uploadDir);

    if (
      !resolved.startsWith(normalizedUploadDir + path.sep) &&
      resolved !== normalizedUploadDir
    ) {
      throw new BadRequestException(
        'Directory traversal detected: file access outside storage directory is forbidden',
      );
    }

    return trimmed;
  }

  /**
   * Generates a secure, unguessable server-side filename using crypto.randomUUID().
   */
  private generateFilename(originalName: string, mimeType: string): string {
    const ext =
      mimeType === 'image/png'
        ? '.png'
        : mimeType === 'image/webp'
          ? '.webp'
          : '.jpg';

    const uniqueId = crypto.randomUUID();
    return `${uniqueId}${ext}`;
  }

  async saveFile(file: StoredFileInput): Promise<StoredFileResult> {
    this.ensureUploadDirectory();

    const filename = this.generateFilename(file.originalName, file.mimeType);
    const safeFilename = this.assertSafeFilename(filename);
    const targetPath = path.join(this.uploadDir, safeFilename);

    await fs.promises.writeFile(targetPath, file.buffer);

    return {
      filename: safeFilename,
      url: `/api/v1/catalog/images/${safeFilename}`,
      size: file.buffer.length,
      mimeType: file.mimeType,
    };
  }

  async deleteFile(filename: string): Promise<boolean> {
    try {
      const safeFilename = this.assertSafeFilename(filename);
      const targetPath = path.join(this.uploadDir, safeFilename);

      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.warn(`Failed to delete local file "${filename}": ${error}`);
      return false;
    }
  }

  getFilePath(filename: string): string {
    const safeFilename = this.assertSafeFilename(filename);
    return path.join(this.uploadDir, safeFilename);
  }

  async fileExists(filename: string): Promise<boolean> {
    try {
      const safeFilename = this.assertSafeFilename(filename);
      const targetPath = path.join(this.uploadDir, safeFilename);
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  }
}
