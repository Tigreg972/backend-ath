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
import { MailService } from '../mail/mail.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  private buildAuthResponse(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    const {
      password,
      resetPasswordToken,
      resetPasswordExpiresAt,
      emailVerificationToken,
      emailVerificationExpiresAt,
      ...safeUser
    } = user;

    return {
      token,
      accessToken: token,
      user: safeUser,
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
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
      message:
        'Compte créé avec succès. Vérifiez votre boîte mail pour activer votre compte.',
      user: this.buildAuthResponse(user).user,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);

    if (!isValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    return this.buildAuthResponse(user);
  }

  async me(userId: number) {
    return this.usersService.findSafeById(userId);
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByEmailVerificationToken(token);

    if (!user || !user.emailVerificationExpiresAt) {
      throw new NotFoundException('Lien de validation invalide');
    }

    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Lien de validation expiré');
    }

    user.isEmailConfirmed = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiresAt = undefined;

    await this.usersService.save(user);

    return {
      message: 'Adresse email confirmée avec succès',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      return {
        message:
          'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      };
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
      message:
        'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByResetPasswordToken(dto.token);

    if (!user || !user.resetPasswordExpiresAt) {
      throw new NotFoundException('Lien de réinitialisation invalide');
    }

    if (user.resetPasswordExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Lien de réinitialisation expiré');
    }

    user.password = await bcrypt.hash(dto.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;

    await this.usersService.save(user);

    return {
      message: 'Mot de passe réinitialisé avec succès',
    };
  }
}