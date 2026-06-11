import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-2fa')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  verifyTwoFactor(@Body() dto: VerifyTwoFactorDto) {
    return this.authService.verifyTwoFactor(dto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('verify-email/:token')
  verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Get('verify-email-change/:token')
  verifyEmailChange(@Param('token') token: string) {
    return this.authService.verifyEmailChange(token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.authService.me(user.id);
  }
}