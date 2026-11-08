export interface StoredFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export interface StoredFileResult {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export abstract class StorageService {
  abstract saveFile(file: StoredFileInput): Promise<StoredFileResult>;
  abstract deleteFile(filename: string): Promise<boolean>;
  abstract getFilePath(filename: string): string;
  abstract fileExists(filename: string): Promise<boolean>;
}

