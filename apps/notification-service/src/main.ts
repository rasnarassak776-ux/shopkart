import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env before NestJS bootstrap
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('NotificationService');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-Internal-Api-Key',
    ],
  });

  const configService = app.get(ConfigService);
  const port =
    Number(process.env.NOTIFICATION_SERVICE_PORT) ||
    configService.get<number>('NOTIFICATION_SERVICE_PORT') ||
    3050;

  await app.listen(port);
  logger.log(`Notification Service is running on port ${port} (prefix: api/v1)`);
}

bootstrap();
