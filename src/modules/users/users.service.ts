import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { PaymentMethod } from './entities/payment-method.entity';

import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,

    @InjectRepository(PaymentMethod)
    private readonly paymentMethodsRepository: Repository<PaymentMethod>,
  ) {}

  private sanitizeUser(user: User) {
    const {
      password,
      resetPasswordToken,
      resetPasswordExpiresAt,
      ...safeUser
    } = user;

    return safeUser;
  }

  private validateExpiry(expiry: string) {
    const [monthValue, yearValue] = expiry.split('/');
    const month = Number(monthValue);
    const year = Number(`20${yearValue}`);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (
      year < currentYear ||
      (year === currentYear && month < currentMonth)
    ) {
      throw new BadRequestException('La carte est expirée');
    }
  }

  private formatPaymentMethod(paymentMethod: PaymentMethod) {
    return {
      id: paymentMethod.id,
      cardName: paymentMethod.cardName,
      last4: paymentMethod.last4,
      expiry: paymentMethod.expiry,
      brand: paymentMethod.brand,
      isDefault: paymentMethod.isDefault,
    };
  }

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async findByResetPasswordToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        resetPasswordToken: token,
      },
    });
  }

  async findAll() {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user || user.isActive === false) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  async findSafeById(id: number) {
    const user = await this.findById(id);

    return this.sanitizeUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        email,
        isActive: true,
      },
    });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);

    return this.usersRepository.save(user);
  }

  async updateMyProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.findById(userId);

    if (dto.email && dto.email !== user.email) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Le mot de passe actuel est obligatoire pour modifier l’email',
        );
      }

      const isPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Mot de passe actuel incorrect');
      }

      const existingUser = await this.findByEmail(dto.email);

      if (existingUser && existingUser.id !== user.id) {
        throw new ConflictException('Cet email est déjà utilisé');
      }

      user.email = dto.email;
      user.isEmailConfirmed = false;
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }

    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName;
    }

    if (dto.phone !== undefined) {
      user.phone = dto.phone;
    }

    user.fullName = `${user.firstName} ${user.lastName}`.trim();

    const updatedUser = await this.usersRepository.save(user);

    return this.sanitizeUser(updatedUser);
  }

  async changeMyPassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.findById(userId);

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(
        'Le nouveau mot de passe et la confirmation ne correspondent pas',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);

    await this.usersRepository.save(user);

    return {
      message: 'Mot de passe modifié avec succès',
    };
  }

  async deleteMyAccount(userId: number) {
    const user = await this.findById(userId);

    user.firstName = 'Utilisateur';
    user.lastName = 'Supprimé';
    user.fullName = 'Utilisateur supprimé';

    user.phone = undefined;

    user.email = `deleted_${user.id}_${Date.now()}@deleted.local`;

    user.password = await bcrypt.hash(
      `deleted_${Date.now()}_${Math.random()}`,
      10,
    );

    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;

    user.isEmailConfirmed = false;
    user.isActive = false;

    await this.usersRepository.save(user);

    return {
      message: 'Compte supprimé avec succès',
    };
  }

  async findMyAddresses(userId: number): Promise<Address[]> {
    return this.addressesRepository.find({
      where: {
        userId,
      },
      order: {
        isDefault: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async createAddress(userId: number, dto: CreateAddressDto): Promise<Address> {
    if (dto.isDefault) {
      await this.addressesRepository.update(
        { userId },
        { isDefault: false },
      );
    }

    const address = this.addressesRepository.create({
      ...dto,
      userId,
    });

    return this.addressesRepository.save(address);
  }

  async updateAddress(
    userId: number,
    addressId: number,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.addressesRepository.findOne({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Adresse introuvable');
    }

    if (dto.isDefault) {
      await this.addressesRepository.update(
        { userId },
        { isDefault: false },
      );
    }

    Object.assign(address, dto);

    return this.addressesRepository.save(address);
  }

  async removeAddress(userId: number, addressId: number) {
    const address = await this.addressesRepository.findOne({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Adresse introuvable');
    }

    await this.addressesRepository.remove(address);

    return {
      message: 'Adresse supprimée avec succès',
    };
  }

  async findMyPaymentMethods(userId: number) {
    const methods = await this.paymentMethodsRepository.find({
      where: { userId },
      order: {
        isDefault: 'DESC',
        createdAt: 'DESC',
      },
    });

    return methods.map((method) => this.formatPaymentMethod(method));
  }

  async createPaymentMethod(userId: number, dto: CreatePaymentMethodDto) {
    this.validateExpiry(dto.expiry);

    const cleanCardNumber = String(dto.cardNumber).replace(/\D/g, '');

    if (cleanCardNumber.length < 12 || cleanCardNumber.length > 19) {
      throw new BadRequestException('Numéro de carte invalide');
    }

    const methodsCount = await this.paymentMethodsRepository.count({
      where: { userId },
    });

    const shouldBeDefault = Boolean(dto.isDefault) || methodsCount === 0;

    if (shouldBeDefault) {
      await this.paymentMethodsRepository.update(
        { userId },
        { isDefault: false },
      );
    }

    const method = this.paymentMethodsRepository.create({
      userId,
      cardName: dto.cardName,
      last4: cleanCardNumber.slice(-4),
      expiry: dto.expiry,
      brand: dto.brand || 'cb',
      isDefault: shouldBeDefault,
    });

    const savedMethod = await this.paymentMethodsRepository.save(method);

    return this.formatPaymentMethod(savedMethod);
  }

  async updatePaymentMethod(
    userId: number,
    paymentMethodId: number,
    dto: UpdatePaymentMethodDto,
  ) {
    const method = await this.paymentMethodsRepository.findOne({
      where: {
        id: paymentMethodId,
        userId,
      },
    });

    if (!method) {
      throw new NotFoundException('Moyen de paiement introuvable');
    }

    if (dto.expiry !== undefined) {
      this.validateExpiry(dto.expiry);
      method.expiry = dto.expiry;
    }

    if (dto.cardNumber !== undefined) {
      const cleanCardNumber = String(dto.cardNumber).replace(/\D/g, '');

      if (cleanCardNumber.length < 12 || cleanCardNumber.length > 19) {
        throw new BadRequestException('Numéro de carte invalide');
      }

      method.last4 = cleanCardNumber.slice(-4);
    }

    if (dto.cardName !== undefined) {
      method.cardName = dto.cardName;
    }

    if (dto.brand !== undefined) {
      method.brand = dto.brand;
    }

    if (dto.isDefault) {
      await this.paymentMethodsRepository.update(
        { userId },
        { isDefault: false },
      );

      method.isDefault = true;
    } else if (dto.isDefault !== undefined) {
      method.isDefault = dto.isDefault;
    }

    const savedMethod = await this.paymentMethodsRepository.save(method);

    return this.formatPaymentMethod(savedMethod);
  }

  async removePaymentMethod(userId: number, paymentMethodId: number) {
    const method = await this.paymentMethodsRepository.findOne({
      where: {
        id: paymentMethodId,
        userId,
      },
    });

    if (!method) {
      throw new NotFoundException('Moyen de paiement introuvable');
    }

    const wasDefault = method.isDefault;

    await this.paymentMethodsRepository.remove(method);

    if (wasDefault) {
      const nextMethod = await this.paymentMethodsRepository.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      if (nextMethod) {
        nextMethod.isDefault = true;
        await this.paymentMethodsRepository.save(nextMethod);
      }
    }

    return {
      message: 'Moyen de paiement supprimé avec succès',
    };
  }

  async setDefaultPaymentMethod(userId: number, paymentMethodId: number) {
    const method = await this.paymentMethodsRepository.findOne({
      where: {
        id: paymentMethodId,
        userId,
      },
    });

    if (!method) {
      throw new NotFoundException('Moyen de paiement introuvable');
    }

    await this.paymentMethodsRepository.update(
      { userId },
      { isDefault: false },
    );

    method.isDefault = true;

    const savedMethod = await this.paymentMethodsRepository.save(method);

    return this.formatPaymentMethod(savedMethod);
  }
}