import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageService } from './local-storage.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('catalog/images')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogImagesController {
  constructor(private readonly storageService: LocalStorageService) {}

  /**
   * Public endpoint allowing the customer storefront and admin panel to view
   * locally stored product images securely.
   * Path traversal is strictly rejected and only whitelisted image extensions
   * are served with appropriate headers.
   */
  @Public()
  @Get(':filename')
  async serveImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    let safeFilename: string;
    try {
      safeFilename = this.storageService.assertSafeFilename(filename);
    } catch {
      throw new NotFoundException('Image not found');
    }

    const exists = await this.storageService.fileExists(safeFilename);
    if (!exists) {
      throw new NotFoundException('Image not found');
    }

    const filePath = this.storageService.getFilePath(safeFilename);
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ statusCode: 500, message: 'Failed to read image file' });
      }
    });
    stream.pipe(res);
  }
}

