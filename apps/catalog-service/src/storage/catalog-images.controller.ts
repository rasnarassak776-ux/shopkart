import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from './storage.interface';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('catalog/images')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogImagesController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @Get(':filename')
  async serveImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const file = await this.storageService.getFileStream(filename);

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      file.stream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).json({
            statusCode: 500,
            message: 'Failed to read image file',
          });
        } else {
          res.destroy();
        }
      });

      file.stream.pipe(res);
    } catch {
      throw new NotFoundException('Image not found');
    }
  }
}
