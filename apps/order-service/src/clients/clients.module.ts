import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogClient } from './catalog.client';
import { AuthClient } from './auth.client';
import { CartClient } from './cart.client';
import { NotificationClient } from './notification.client';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [CatalogClient, AuthClient, CartClient, NotificationClient],
  exports: [CatalogClient, AuthClient, CartClient, NotificationClient],
})
export class ClientsModule {}
