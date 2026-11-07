import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env before NestJS bootstrap
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
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
    ],
  });

  const configService = app.get(ConfigService);
  const port =
    Number(process.env.CATALOG_SERVICE_PORT) ||
    configService.get<number>('CATALOG_SERVICE_PORT') ||
    3020;

  await app.listen(port);
  console.log(`Catalog Service is running on port ${port}`);
}

bootstrap();
