import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { AzureBlobStorageService } from './azure-blob-storage.service';
import { CatalogImagesController } from './catalog-images.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [CatalogImagesController],
  providers: [
    LocalStorageService,
    AzureBlobStorageService,
    {
      provide: StorageService,
      inject: [ConfigService, LocalStorageService, AzureBlobStorageService],
      useFactory: (
        config: ConfigService,
        localStorage: LocalStorageService,
        azureStorage: AzureBlobStorageService,
      ) => {
        const provider = config.get<string>(
          'CATALOG_STORAGE_PROVIDER',
          'local',
        );

        if (provider === 'azure') {
          return azureStorage;
        }

        return localStorage;
      },
    },
  ],
  exports: [StorageService, LocalStorageService],
})
export class StorageModule {}
