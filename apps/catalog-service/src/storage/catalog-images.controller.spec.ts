import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { CatalogImagesController } from './catalog-images.controller';
import { LocalStorageService } from './local-storage.service';

describe('CatalogImagesController (Public Image Serving)', () => {
  let controller: CatalogImagesController;
  let storageService: {
    assertSafeFilename: jest.Mock;
    fileExists: jest.Mock;
    getFilePath: jest.Mock;
  };
  let mockRes: {
    setHeader: jest.Mock;
    status: jest.Mock;
    json: jest.Mock;
    headersSent: boolean;
  };

  beforeEach(() => {
    storageService = {
      assertSafeFilename: jest.fn().mockImplementation((fn: string) => fn),
      fileExists: jest.fn(),
      getFilePath: jest.fn(),
    };
    mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      headersSent: false,
    };

    controller = new CatalogImagesController(
      storageService as unknown as LocalStorageService,
    );
  });

  it('throws NotFoundException when file does not exist on disk', async () => {
    storageService.fileExists.mockResolvedValue(false);

    await expect(
      controller.serveImage('missing.jpg', mockRes as unknown as Response),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when filename fails path traversal validation', async () => {
    storageService.assertSafeFilename.mockImplementation(() => {
      throw new Error('Traversal attempt');
    });

    await expect(
      controller.serveImage('../secret.jpg', mockRes as unknown as Response),
    ).rejects.toThrow(NotFoundException);
  });
});

