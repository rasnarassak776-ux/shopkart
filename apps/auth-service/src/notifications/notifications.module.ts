import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationClientService } from './notification-client.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [NotificationClientService],
  exports: [NotificationClientService],
})
export class NotificationsModule {}
