import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogClient } from './catalog.client';
import { AuthClient } from './auth.client';
import { CartClient } from './cart.client';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [CatalogClient, AuthClient, CartClient],
  exports: [CatalogClient, AuthClient, CartClient],
})
export class ClientsModule {}
