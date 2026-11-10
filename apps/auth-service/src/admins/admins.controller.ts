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
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto, UpdateAdminStatusDto } from './dto/update-admin.dto';
import { QueryAdminsDto } from './dto/query-admins.dto';

/**
 * Admin account management. Superadmin-only at class level so no handler can be
 * left open by accident; every mutation is audit-logged.
 */
@Controller('admins')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.SUPERADMIN)
@RateLimit({ name: 'admin_management', limit: 60, windowSeconds: 60 })
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ name: 'admin_create', limit: 10, windowSeconds: 60 })
  async create(@Body() dto: CreateAdminDto, @CurrentUser('id') actorId: string, @Req() req: Request) {
    return {
      success: true,
      message: 'Admin account created successfully.',
      admin: await this.adminsService.create(dto, auditContextFrom(req, actorId)),
    };
  }

  @Get()
  async findAll(@Query() query: QueryAdminsDto) {
    return this.adminsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { admin: await this.adminsService.findOne(id) };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    return {
      success: true,
      message: 'Admin account updated successfully.',
      admin: await this.adminsService.update(id, dto, auditContextFrom(req, actorId)),
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminStatusDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    const admin = await this.adminsService.updateStatus(id, dto, auditContextFrom(req, actorId));
    return {
      success: true,
      message: admin.isActive ? 'Admin account activated.' : 'Admin account deactivated.',
      admin,
    };
  }
}
