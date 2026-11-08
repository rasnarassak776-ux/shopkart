import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.interface';

describe('ProductsService - Image Management', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findUnique: jest.Mock;
    };
    productImage: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let storageService: {
    saveFile: jest.Mock;
    deleteFile: jest.Mock;
    getFilePath: jest.Mock;
    fileExists: jest.Mock;
  };

  const sampleProduct = {
    id: 'prod-uuid-1',
    name: 'Wireless Mechanical Keyboard',
  };

  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);

  beforeEach(() => {
    prisma = {
      product: {
        findUnique: jest.fn(),
      },
      productImage: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }
        return Promise.all(callback);
      }),
    };

    storageService = {
      saveFile: jest.fn().mockImplementation(async (file) => ({
        filename: `mock-${Date.now()}-${file.originalName}`,
        url: `/api/v1/catalog/images/mock-${Date.now()}-${file.originalName}`,
        size: file.buffer.length,
        mimeType: file.mimeType,
      })),
      deleteFile: jest.fn().mockResolvedValue(true),
      getFilePath: jest.fn(),
      fileExists: jest.fn(),
    };

    service = new ProductsService(
      prisma as unknown as PrismaService,
      storageService as unknown as StorageService,
    );
  });

  describe('uploadImages', () => {
    it('successfully uploads valid images and sets first image as primary when no primary exists', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.productImage.findMany.mockResolvedValue([]); // No existing images
      prisma.productImage.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `img-${Date.now()}`, ...data }),
      );

      const files = [
        {
          buffer: validJpegBuffer,
          originalname: 'kb-front.jpg',
          mimetype: 'image/jpeg',
          size: validJpegBuffer.length,
        },
        {
          buffer: validPngBuffer,
          originalname: 'kb-side.png',
          mimetype: 'image/png',
          size: validPngBuffer.length,
        },
      ];

      const result = (await service.uploadImages(sampleProduct.id, files)) as any[];

      expect(storageService.saveFile).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      // First image becomes primary
      expect(result[0].isPrimary).toBe(true);
      expect(result[0].displayOrder).toBe(0);
      // Second image is not primary
      expect(result[1].isPrimary).toBe(false);
      expect(result[1].displayOrder).toBe(1);
    });

    it('does not set primary if product already has an existing primary image', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.productImage.findMany.mockResolvedValue([
        {
          id: 'existing-img-1',
          productId: sampleProduct.id,
          isPrimary: true,
          displayOrder: 0,
        },
      ]);
      prisma.productImage.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `img-new`, ...data }),
      );

      const files = [
        {
          buffer: validJpegBuffer,
          originalname: 'extra.jpg',
          mimetype: 'image/jpeg',
          size: validJpegBuffer.length,
        },
      ];

      const result = (await service.uploadImages(sampleProduct.id, files)) as any[];

      expect(result[0].isPrimary).toBe(false);
      expect(result[0].displayOrder).toBe(1);
    });

    it('throws NotFoundException when uploading to non-existent product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadImages('non-existent-product', [
          {
            buffer: validJpegBuffer,
            originalname: 'test.jpg',
            mimetype: 'image/jpeg',
            size: validJpegBuffer.length,
          },
        ]),
      ).rejects.toThrow(NotFoundException);

      expect(storageService.saveFile).not.toHaveBeenCalled();
    });

    it('rejects requests with more than 8 files', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);

      const nineFiles = Array.from({ length: 9 }).map((_, i) => ({
        buffer: validJpegBuffer,
        originalname: `file-${i}.jpg`,
        mimetype: 'image/jpeg',
        size: validJpegBuffer.length,
      }));

      await expect(
        service.uploadImages(sampleProduct.id, nineFiles),
      ).rejects.toThrow(BadRequestException);

      expect(storageService.saveFile).not.toHaveBeenCalled();
    });

    it('cleans up saved files on disk if the database transaction fails (no orphaned files)', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.productImage.findMany.mockResolvedValue([]);

      storageService.saveFile.mockResolvedValueOnce({
        filename: 'saved-on-disk.jpg',
        url: '/api/v1/catalog/images/saved-on-disk.jpg',
        size: 100,
        mimeType: 'image/jpeg',
      });

      // Simulate a DB transaction failure
      prisma.$transaction.mockRejectedValueOnce(
        new Error('Database transaction connection error'),
      );

      await expect(
        service.uploadImages(sampleProduct.id, [
          {
            buffer: validJpegBuffer,
            originalname: 'file.jpg',
            mimetype: 'image/jpeg',
            size: validJpegBuffer.length,
          },
        ]),
      ).rejects.toThrow('Database transaction connection error');

      // Verify cleanup was invoked for the saved file
      expect(storageService.deleteFile).toHaveBeenCalledWith('saved-on-disk.jpg');
    });
  });

  describe('deleteImage', () => {
    it('safely deletes image record and physical file', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.productImage.findUnique.mockResolvedValue({
        id: 'img-to-del',
        productId: sampleProduct.id,
        isPrimary: false,
        imageUrl: '/api/v1/catalog/images/keyboard-side.jpg',
      });

      const result = await service.deleteImage(sampleProduct.id, 'img-to-del');

      expect(result.success).toBe(true);
      expect(prisma.productImage.delete).toHaveBeenCalledWith({
        where: { id: 'img-to-del' },
      });
      expect(storageService.deleteFile).toHaveBeenCalledWith('keyboard-side.jpg');
    });

    it('reassigns primary status to next available image if deleted image was primary', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.productImage.findUnique.mockResolvedValue({
        id: 'primary-img',
        productId: sampleProduct.id,
        isPrimary: true,
        imageUrl: '/api/v1/catalog/images/main.jpg',
      });
      // Sibling image to promote
      prisma.productImage.findFirst.mockResolvedValue({
        id: 'sibling-img',
        productId: sampleProduct.id,
        isPrimary: false,
        displayOrder: 1,
      });

      const result = await service.deleteImage(sampleProduct.id, 'primary-img');

      expect(result.promotedPrimaryImageId).toBe('sibling-img');
      expect(prisma.productImage.update).toHaveBeenCalledWith({
        where: { id: 'sibling-img' },
        data: { isPrimary: true },
      });
      expect(prisma.productImage.delete).toHaveBeenCalledWith({
        where: { id: 'primary-img' },
      });
    });

    it('rejects deletion if image belongs to another product', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.productImage.findUnique.mockResolvedValue({
        id: 'other-img',
        productId: 'different-product-uuid',
      });

      await expect(
        service.deleteImage(sampleProduct.id, 'other-img'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.productImage.delete).not.toHaveBeenCalled();
      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('setPrimaryImage', () => {
    it('sets selected image as primary and unsets all sibling images in a transaction', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.productImage.findUnique.mockResolvedValue({
        id: 'target-img-id',
        productId: sampleProduct.id,
        isPrimary: false,
      });
      prisma.productImage.update.mockResolvedValue({
        id: 'target-img-id',
        productId: sampleProduct.id,
        isPrimary: true,
      });

      const result = await service.setPrimaryImage(
        sampleProduct.id,
        'target-img-id',
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.productImage.updateMany).toHaveBeenCalledWith({
        where: { productId: sampleProduct.id },
        data: { isPrimary: false },
      });
      expect(prisma.productImage.update).toHaveBeenCalledWith({
        where: { id: 'target-img-id' },
        data: { isPrimary: true },
      });
      expect(result.isPrimary).toBe(true);
    });

    it('throws NotFoundException if image does not belong to the product', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.productImage.findUnique.mockResolvedValue({
        id: 'alien-img-id',
        productId: 'completely-different-product',
      });

      await expect(
        service.setPrimaryImage(sampleProduct.id, 'alien-img-id'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.productImage.update).not.toHaveBeenCalled();
    });
  });
});
