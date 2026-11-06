import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './services/password.service';
import { TokenService, TokenPair } from './services/token.service';
import { RedisService } from '../redis/redis.service';
import { PasswordResetDeliveryService } from './services/password-reset-delivery.service';

export interface RegistrationResponse {
  success: boolean;
  message: string;
  customer: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  };
}

export interface LoginResponse extends TokenPair {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    createdAt: Date;
  };
}

export interface RefreshResponse extends TokenPair {
  success: boolean;
  message: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly deliveryService: PasswordResetDeliveryService,
  ) {}

  async register(registerDto: RegisterDto): Promise<RegistrationResponse> {
    const normalizedEmail = registerDto.email.trim().toLowerCase();

    // 1. Check whether normalized email already exists
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new ConflictException(
          'An account with this email address already exists.',
        );
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Failed to query user uniqueness for email: ${normalizedEmail}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Unable to complete registration. Please try again later.',
      );
    }

    // 2. Retrieve existing 'customer' role from auth.roles
    let customerRoleId: string;
    let customerRoleName: string;

    try {
      const customerRole = await this.prisma.role.findUnique({
        where: { name: 'customer' },
      });

      if (!customerRole) {
        this.logger.error(
          'System configuration error: "customer" role not found in auth.roles.',
        );
        throw new InternalServerErrorException(
          'Customer role is not configured. Please contact support.',
        );
      }

      customerRoleId = customerRole.id;
      customerRoleName = customerRole.name;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(
        'Database error querying system roles.',
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Unable to complete registration. Please try again later.',
      );
    }

    // 3. Hash password using bcrypt (cost factor 12)
    let passwordHash: string;
    try {
      passwordHash = await this.passwordService.hash(registerDto.password);
    } catch (error) {
      this.logger.error(
        'Error during password hashing.',
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Unable to process credentials safely.',
      );
    }

    // 4. Save new customer user to PostgreSQL auth.users
    try {
      const user = await this.prisma.user.create({
        data: {
          name: registerDto.name.trim(),
          email: normalizedEmail,
          passwordHash,
          phone: registerDto.phone ? registerDto.phone.trim() : null,
          roleId: customerRoleId,
          isActive: true,
        },
      });

      this.logger.log(
        `Customer successfully registered: id=${user.id}, email=${user.email}`,
      );

      // 5. Return safe response (no passwordHash or sensitive database data)
      return {
        success: true,
        message: 'Customer registered successfully.',
        customer: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: customerRoleName,
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Database error saving customer ${normalizedEmail}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to save customer account.',
      );
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const normalizedEmail = loginDto.email.trim().toLowerCase();
    const client = this.redisService.getClient();
    const rateLimitKey = `auth:login_rate_limit:${normalizedEmail}`;

    // Rate limiting: enforce brute-force protection after 5 consecutive failed attempts
    if (client) {
      const attemptsStr = await client.get(rateLimitKey);
      const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
      if (attempts >= 5) {
        this.logger.warn(
          `Excessive failed login attempts detected for email: ${normalizedEmail}`,
        );
        throw new UnauthorizedException(
          'Too many failed login attempts. Please try again in 15 minutes or reset your password.',
        );
      }
    }

    // 1. Fetch user by email including role
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        role: true,
      },
    });

    if (!user) {
      if (client) {
        const attempts = await client.incr(rateLimitKey);
        if (attempts === 1) await client.expire(rateLimitKey, 900);
      }
      throw new UnauthorizedException('Invalid email or password.');
    }

    // 2. Check active state
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is deactivated. Please contact support.',
      );
    }

    // 3. Verify password hash using bcrypt
    const isPasswordValid = await this.passwordService.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      if (client) {
        const attempts = await client.incr(rateLimitKey);
        if (attempts === 1) await client.expire(rateLimitKey, 900);
      }
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Reset failed login counter on successful credential verification
    if (client) {
      await client.del(rateLimitKey);
    }

    // 4. Generate token pair (Access Token 15m + Refresh Token 7d) and store session in Redis
    const tokens = await this.tokenService.generateTokenPair({
      id: user.id,
      email: user.email,
      role: { name: user.role.name },
    });

    this.logger.log(`User logged in successfully: email=${user.email}, id=${user.id}`);

    return {
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<RefreshResponse> {
    if (!refreshTokenDto.refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    // 1. Atomically consume refresh token in Redis via Lua script (concurrency safe & atomic rotation)
    const payload = await this.tokenService.consumeRefreshToken(
      refreshTokenDto.refreshToken,
    );

    // 2. Fetch user by id with role
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account not found or deactivated.');
    }

    // 3. Issue new token pair
    const tokens = await this.tokenService.generateTokenPair({
      id: user.id,
      email: user.email,
      role: { name: user.role.name },
    });

    this.logger.log(`Tokens refreshed successfully for user id=${user.id}`);

    return {
      success: true,
      message: 'Tokens refreshed successfully.',
      ...tokens,
    };
  }

  async logout(userId: string, rawToken?: string) {
    // 1. Revoke all user refresh token sessions in Redis
    await this.tokenService.revokeAllUserSessions(userId);

    // 2. Blacklist current access token in Redis
    if (rawToken) {
      await this.tokenService.blacklistToken(rawToken);
    }

    this.logger.log(`User logged out: userId=${userId}`);

    return {
      success: true,
      message: 'Successfully logged out.',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const genericResponse = {
      success: true,
      message:
        'If an account exists with this email, password recovery instructions will be sent.',
    };

    const normalizedEmail = forgotPasswordDto.email.trim().toLowerCase();

    try {
      const user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      // Anti-enumeration: If user does not exist or is inactive, return identical generic response
      if (!user || !user.isActive) {
        this.logger.log(
          `Password reset requested for nonexistent or inactive email: ${normalizedEmail}`,
        );
        return genericResponse;
      }

      const client = this.redisService.getClient();
      if (!client) {
        this.logger.error('Redis client not available for password recovery token storage.');
        return genericResponse;
      }

      // Rate limit check: 60-second cooldown per email
      const rateLimitKey = `auth:reset_rate_limit:${normalizedEmail}`;
      const isRateLimited = await client.get(rateLimitKey);
      if (isRateLimited) {
        this.logger.warn(`Password reset rate limited for: ${normalizedEmail}`);
        return genericResponse;
      }

      // Generate 32-byte cryptographically secure random token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const resetKey = `auth:reset_token:${tokenHash}`;
      const resetPayload = JSON.stringify({
        userId: user.id,
        email: user.email,
        createdAt: Date.now(),
      });

      // Store hashed token with 15-minute TTL (900 seconds)
      await client.set(resetKey, resetPayload, 'EX', 900);

      // Set rate limit cooldown key (60 seconds)
      await client.set(rateLimitKey, '1', 'EX', 60);

      // Dispatch password recovery link safely via delivery service abstraction
      await this.deliveryService.sendPasswordResetLink(user.email, rawToken);

      return genericResponse;
    } catch (error) {
      this.logger.error(
        `Error processing forgot-password for email: ${normalizedEmail}`,
        (error as Error).stack,
      );
      // Always preserve anti-enumeration even on unexpected internal errors
      return genericResponse;
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const rawToken = resetPasswordDto.token ? resetPasswordDto.token.trim() : '';
    const newPassword = resetPasswordDto.newPassword;

    if (!rawToken) {
      throw new BadRequestException('Reset token is required.');
    }

    const client = this.redisService.getClient();
    if (!client) {
      throw new InternalServerErrorException('Cache service is unavailable.');
    }

    // SHA-256 hash of provided token
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetKey = `auth:reset_token:${tokenHash}`;

    // Atomic single-use consumption via Lua script (GET and DEL atomically)
    const luaScript = `
      local val = redis.call('GET', KEYS[1])
      if val then
        redis.call('DEL', KEYS[1])
      end
      return val
    `;

    const storedData = (await client.eval(luaScript, 1, resetKey)) as string | null;

    if (!storedData) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    let parsed: { userId: string; email: string };
    try {
      parsed = JSON.parse(storedData);
    } catch {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: parsed.userId },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('User account is invalid or deactivated.');
    }

    // Hash new password using PasswordService (bcryptjs cost 12)
    const passwordHash = await this.passwordService.hash(newPassword);

    // Update password in PostgreSQL
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate all active user sessions in Redis
    await this.tokenService.revokeAllUserSessions(user.id);

    this.logger.log(`Password reset successfully completed for user id=${user.id}`);

    return {
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }
}
