import { Module } from '@nestjs/common';
import { CatalogClient } from './catalog.client';

@Module({
  providers: [CatalogClient],
  exports: [CatalogClient],
})
export class CatalogModule {}
