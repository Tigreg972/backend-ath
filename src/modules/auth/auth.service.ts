import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  private buildAuthResponse(user: any, rememberMe = false) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: rememberMe ? '30d' : '24h',
    });

    const {
      password,
      resetPasswordToken,
      resetPasswordExpiresAt,
      emailVerificationToken,
      emailVerificationExpiresAt,
      pendingEmail,
      emailChangeToken,
      emailChangeExpiresAt,
      adminTwoFactorCode,
      adminTwoFactorExpiresAt,
      adminTwoFactorRememberMe,
      ...safeUser
    } = user;

    return {
      token,
      accessToken: token,
      expiresIn: rememberMe ? '30d' : '24h',
      user: safeUser,
    };
  }

  private generateTwoFactorCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('EMAIL_ALREADY_USED');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = randomBytes(32).toString('hex');

    const user = await this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      fullName: `${dto.firstName} ${dto.lastName}`.trim(),
      phone: dto.phone,
      email: dto.email,
      password: hashedPassword,
      isEmailConfirmed: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5173';

    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    await this.mailService.sendEmailVerificationEmail(
      user.email,
      user.fullName,
      verificationUrl,
    );

    return {
      message: 'REGISTER_SUCCESS_EMAIL_SENT',
      user: this.buildAuthResponse(user).user,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);

    if (!isValid) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('ACCOUNT_DISABLED');
    }

    if (!user.isEmailConfirmed) {
      throw new UnauthorizedException('EMAIL_NOT_CONFIRMED');
    }

    if (user.role === UserRole.ADMIN) {
      const code = this.generateTwoFactorCode();

      user.adminTwoFactorCode = await bcrypt.hash(code, 10);
      user.adminTwoFactorExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      user.adminTwoFactorRememberMe = Boolean(dto.rememberMe);

      await this.usersService.save(user);

      await this.mailService.sendAdminTwoFactorCodeEmail(
        user.email,
        user.fullName,
        code,
      );

      return {
        message: 'ADMIN_2FA_REQUIRED',
        requiresTwoFactor: true,
        email: user.email,
      };
    }

    return this.buildAuthResponse(user, Boolean(dto.rememberMe));
  }

  async verifyTwoFactor(dto: VerifyTwoFactorDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('INVALID_2FA_CODE');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('TWO_FACTOR_NOT_REQUIRED');
    }

    if (!user.adminTwoFactorCode || !user.adminTwoFactorExpiresAt) {
      throw new UnauthorizedException('INVALID_2FA_CODE');
    }

    if (user.adminTwoFactorExpiresAt.getTime() < Date.now()) {
      user.adminTwoFactorCode = undefined;
      user.adminTwoFactorExpiresAt = undefined;
      user.adminTwoFactorRememberMe = false;

      await this.usersService.save(user);

      throw new UnauthorizedException('TWO_FACTOR_CODE_EXPIRED');
    }

    const isCodeValid = await bcrypt.compare(
      dto.code,
      user.adminTwoFactorCode,
    );

    if (!isCodeValid) {
      throw new UnauthorizedException('INVALID_2FA_CODE');
    }

    const rememberMe = Boolean(user.adminTwoFactorRememberMe);

    user.adminTwoFactorCode = undefined;
    user.adminTwoFactorExpiresAt = undefined;
    user.adminTwoFactorRememberMe = false;

    await this.usersService.save(user);

    return this.buildAuthResponse(user, rememberMe);
  }

  async me(userId: number) {
    return this.usersService.findSafeById(userId);
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByEmailVerificationToken(token);

    if (!user || !user.emailVerificationExpiresAt) {
      throw new NotFoundException('INVALID_EMAIL_TOKEN');
    }

    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('EMAIL_TOKEN_EXPIRED');
    }

    user.isEmailConfirmed = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiresAt = undefined;

    await this.usersService.save(user);

    return {
      message: 'EMAIL_VERIFIED_SUCCESS',
    };
  }

  async verifyEmailChange(token: string) {
    return this.usersService.verifyEmailChange(token);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundException('EMAIL_NOT_FOUND');
    }

    const token = randomBytes(32).toString('hex');

    user.resetPasswordToken = token;
    user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.usersService.save(user);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5173';

    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);

    return {
      message: 'RESET_PASSWORD_EMAIL_SENT',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByResetPasswordToken(dto.token);

    if (!user || !user.resetPasswordExpiresAt) {
      throw new NotFoundException('INVALID_RESET_TOKEN');
    }

    if (user.resetPasswordExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('RESET_TOKEN_EXPIRED');
    }

    user.password = await bcrypt.hash(dto.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;

    await this.usersService.save(user);

    return {
      message: 'PASSWORD_RESET_SUCCESS',
    };
  }
}