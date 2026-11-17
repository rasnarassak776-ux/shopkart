import {
  Injectable,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DefaultAzureCredential } from '@azure/identity';
import {
  BlobServiceClient,
  ContainerClient,
} from '@azure/storage-blob';
import { Readable } from 'stream';
import * as crypto from 'crypto';
import * as path from 'path';
import {
  StorageService,
  StoredFileInput,
  StoredFileResult,
} from './storage.interface';

const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i;

@Injectable()
export class AzureBlobStorageService extends StorageService {
  private readonly logger = new Logger(AzureBlobStorageService.name);
  private containerClient?: ContainerClient;
  private initialization?: Promise<ContainerClient>;

  constructor(private readonly config: ConfigService) {
    super();
  }

  private async getContainerClient(): Promise<ContainerClient> {
    if (this.containerClient) {
      return this.containerClient;
    }

    if (!this.initialization) {
      this.initialization = this.initializeContainer();
    }

    return this.initialization;
  }

  private async initializeContainer(): Promise<ContainerClient> {
    const accountName = this.config.get<string>(
      'AZURE_STORAGE_ACCOUNT_NAME',
    );

    const containerName =
      this.config.get<string>('AZURE_STORAGE_CONTAINER') ||
      'product-images';

    if (!accountName) {
      throw new Error('AZURE_STORAGE_ACCOUNT_NAME is not configured');
    }

    const credential = new DefaultAzureCredential();

    const client = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential,
    );

    const container = client.getContainerClient(containerName);

    const exists = await container.exists();

    if (!exists) {
      throw new Error(`Azure Blob container "${containerName}" does not exist`);
    }

    this.logger.log(`Connected to Azure Blob container: ${containerName}`);

    this.containerClient = container;
    return container;
  }

  assertSafeFilename(filename: string): string {
    if (!filename || !SAFE_FILENAME_REGEX.test(filename.trim())) {
      throw new BadRequestException('Invalid image filename');
    }
    return filename.trim();
  }

  async saveFile(file: StoredFileInput): Promise<StoredFileResult> {
    try {
      const extension =
        file.mimeType === 'image/png'
          ? '.png'
          : file.mimeType === 'image/webp'
            ? '.webp'
            : '.jpg';

      const filename = `${crypto.randomUUID()}${extension}`;
      const container = await this.getContainerClient();
      const blob = container.getBlockBlobClient(filename);

      await blob.uploadData(file.buffer, {
        blobHTTPHeaders: {
          blobContentType: file.mimeType,
        },
      });

      return {
        filename,
        url: `/api/v1/catalog/images/${filename}`,
        size: file.buffer.length,
        mimeType: file.mimeType,
      };
    } catch (error) {
      this.logger.error('Azure image upload failed', error);
      throw new InternalServerErrorException('Image upload failed');
    }
  }

  async deleteFile(filename: string): Promise<boolean> {
    try {
      const safeFilename = this.assertSafeFilename(filename);
      const container = await this.getContainerClient();
      const blob = container.getBlockBlobClient(safeFilename);
      const result = await blob.deleteIfExists();
      return result.succeeded;
    } catch (error) {
      this.logger.error('Azure image deletion failed', error);
      return false;
    }
  }

  getFilePath(filename: string): string {
    throw new Error(
      'Azure Blob Storage does not provide local filesystem paths',
    );
  }

  async fileExists(filename: string): Promise<boolean> {
    try {
      const safeFilename = this.assertSafeFilename(filename);
      const container = await this.getContainerClient();
      return container.getBlockBlobClient(safeFilename).exists();
    } catch {
      return false;
    }
  }

  async getFileStream(
    filename: string,
  ): Promise<{ stream: Readable; mimeType: string }> {
    const safeFilename = this.assertSafeFilename(filename);
    const container = await this.getContainerClient();
    const blob = container.getBlockBlobClient(safeFilename);

    const response = await blob.download(0);
    if (!response.readableStreamBody) {
      throw new Error('Image content is unavailable');
    }

    return {
      stream: response.readableStreamBody as Readable,
      mimeType: response.contentType || 'application/octet-stream',
    };
  }
}
