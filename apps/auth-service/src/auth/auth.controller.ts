import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Set HttpOnly refresh token cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });

    return result;
  }

  private validateOrigin(req: Request): void {
    const origin = req.headers.origin;
    if (!origin) return; // Non-browser clients, automated test suites, or same-origin

    const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      if (origin !== allowedOrigin) {
        throw new ForbiddenException('Cross-site request forgery detected: origin rejected.');
      }
    } else {
      if (
        origin !== allowedOrigin &&
        !origin.startsWith('http://localhost:') &&
        !origin.startsWith('http://127.0.0.1:')
      ) {
        throw new ForbiddenException('Cross-site request forgery detected: origin rejected.');
      }
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.validateOrigin(req);

    // Extract refresh token from HttpOnly cookie or request body
    const token =
      req.cookies?.[REFRESH_COOKIE_NAME] || refreshTokenDto.refreshToken;

    if (!token) {
      throw new UnauthorizedException(
        'Refresh token is required via cookie or request body.',
      );
    }

    const result = await this.authService.refresh({ refreshToken: token });

    // Rotate HttpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });

    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.validateOrigin(req);
    const rawAccessToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');

    // Clear HttpOnly refresh token cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: REFRESH_COOKIE_PATH,
    });

    return this.authService.logout(userId, rawAccessToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@CurrentUser() user: any) {
    return {
      success: true,
      user,
    };
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async adminOnlyEndpoint(@CurrentUser() user: any) {
    return {
      success: true,
      message: 'Access granted: Admin authorization verified.',
      user,
    };
  }

  // Phase 5 password recovery endpoints - scaffolded
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
