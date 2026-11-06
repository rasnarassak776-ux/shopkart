import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/services/password.service';
import { TokenService } from '../auth/services/token.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    const updateData: {
      name?: string;
      email?: string;
      phone?: string | null;
    } = {};

    // 1. Name update
    if (updateProfileDto.name !== undefined) {
      updateData.name = updateProfileDto.name.trim();
    }

    // 2. Email update with duplicate detection
    if (updateProfileDto.email !== undefined) {
      const normalizedEmail = updateProfileDto.email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existing && existing.id !== userId) {
          throw new ConflictException(
            'An account with this email address already exists.',
          );
        }
        updateData.email = normalizedEmail;
      }
    }

    // 3. Phone update
    if (updateProfileDto.phone !== undefined) {
      updateData.phone = updateProfileDto.phone.trim() || null;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { role: true },
    });

    this.logger.log(`User profile updated: id=${userId}, email=${updatedUser.email}`);

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role.name,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    // 1. Verify current password
    const isCurrentPasswordValid = await this.passwordService.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password does not match.');
    }

    // 2. Check that new password differs from current password
    const isSamePassword = await this.passwordService.compare(
      changePasswordDto.newPassword,
      user.passwordHash,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from your current password.',
      );
    }

    // 3. Hash new password with bcrypt cost factor 12
    const newPasswordHash = await this.passwordService.hash(
      changePasswordDto.newPassword,
    );

    // 4. Update password in database
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // 5. Invalidate all active user refresh sessions in Redis to require re-login
    await this.tokenService.revokeAllUserSessions(userId);

    this.logger.log(`Password changed and sessions revoked for user id=${userId}`);

    return {
      success: true,
      message:
        'Password changed successfully. Please log in again with your new password.',
    };
  }
}
