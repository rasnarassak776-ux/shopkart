import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalApiKeyGuard } from '../auth/guards/internal-api-key.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { PasswordResetNotificationDto } from './dto/password-reset-notification.dto';
import { DispatchEventDto } from './dto/dispatch-event.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Retrieves paginated in-app notifications for the authenticated user.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.getUserNotifications(user.id, query);
  }

  /**
   * Returns current count of unread in-app notifications.
   */
  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  /**
   * Marks a single in-app notification as read.
   * Strict user isolation: 404 if notification belongs to another user.
   */
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  /**
   * Marks all in-app notifications as read for the authenticated user.
   */
  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  /**
   * Point-to-point internal endpoint for password reset notifications.
   * Dispatched by auth-service per shared contract INotificationDeliveryContract.
   */
  @Post('email/password-reset')
  @Public()
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async sendPasswordReset(@Body() dto: PasswordResetNotificationDto) {
    return this.notificationsService.handlePasswordReset(dto);
  }

  /**
   * Point-to-point internal endpoint for cross-service domain event dispatch.
   * Dispatched by auth-service and order-service.
   */
  @Post('events/dispatch')
  @Public()
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async dispatchEvent(@Body() dto: DispatchEventDto) {
    return this.notificationsService.dispatchEvent(dto);
  }
}
