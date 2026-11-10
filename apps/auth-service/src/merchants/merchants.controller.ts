import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@shopkart/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RateLimitGuard } from '../auth/guards/rate-limit.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimit } from '../auth/decorators/rate-limit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { auditContextFrom } from '../audit/audit-log.service';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto, UpdateMerchantStatusDto } from './dto/update-merchant.dto';
import { QueryMerchantsDto } from './dto/query-merchants.dto';

/**
 * Merchant account management. Superadmin-only at class level so no handler can
 * be left open by accident; every mutation is audit-logged.
 */
@Controller('merchants')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.SUPERADMIN)
@RateLimit({ name: 'merchant_management', limit: 60, windowSeconds: 60 })
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ name: 'merchant_create', limit: 10, windowSeconds: 60 })
  async create(@Body() dto: CreateMerchantDto, @CurrentUser('id') actorId: string, @Req() req: Request) {
    return {
      success: true,
      message: 'Merchant account created successfully.',
      merchant: await this.merchantsService.create(dto, auditContextFrom(req, actorId)),
    };
  }

  @Get()
  async findAll(@Query() query: QueryMerchantsDto) {
    return this.merchantsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { merchant: await this.merchantsService.findOne(id) };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMerchantDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    return {
      success: true,
      message: 'Merchant account updated successfully.',
      merchant: await this.merchantsService.update(id, dto, auditContextFrom(req, actorId)),
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMerchantStatusDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    const merchant = await this.merchantsService.updateStatus(id, dto, auditContextFrom(req, actorId));
    return {
      success: true,
      message: merchant.isActive ? 'Merchant account activated.' : 'Merchant account deactivated.',
      merchant,
    };
  }
}
