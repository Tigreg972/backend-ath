import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaymentMethod } from './entities/payment-method.entity';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodsRepository: Repository<PaymentMethod>,
  ) {}

  private sanitizeCardNumber(cardNumber: string) {
    return cardNumber.replace(/\D/g, '');
  }

  private validateCardExpiration(expiryMonth: number, expiryYear: number) {
    const now = new Date();

    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (
      expiryYear < currentYear ||
      (expiryYear === currentYear && expiryMonth < currentMonth)
    ) {
      throw new BadRequestException('La carte est expirée');
    }
  }

  private formatPaymentMethod(paymentMethod: PaymentMethod) {
    return {
      id: paymentMethod.id,
      brand: paymentMethod.brand,
      cardholderName: paymentMethod.cardholderName,
      last4: paymentMethod.last4,
      expiryMonth: paymentMethod.expiryMonth,
      expiryYear: paymentMethod.expiryYear,
      isDefault: paymentMethod.isDefault,
    };
  }

  async findMyPaymentMethods(userId: number) {
    const paymentMethods = await this.paymentMethodsRepository.find({
      where: {
        userId,
      },
      order: {
        isDefault: 'DESC',
        createdAt: 'DESC',
      },
    });

    return paymentMethods.map((paymentMethod) =>
      this.formatPaymentMethod(paymentMethod),
    );
  }

  async createPaymentMethod(userId: number, dto: CreatePaymentMethodDto) {
    const cleanCardNumber = this.sanitizeCardNumber(dto.cardNumber);

    if (cleanCardNumber.length < 12 || cleanCardNumber.length > 19) {
      throw new BadRequestException('Numéro de carte invalide');
    }

    this.validateCardExpiration(dto.expiryMonth, dto.expiryYear);

    const existingPaymentMethodsCount =
      await this.paymentMethodsRepository.count({
        where: {
          userId,
        },
      });

    const shouldBeDefault = dto.isDefault || existingPaymentMethodsCount === 0;

    if (shouldBeDefault) {
      await this.paymentMethodsRepository.update(
        { userId },
        { isDefault: false },
      );
    }

    const paymentMethod = this.paymentMethodsRepository.create({
      userId,
      brand: dto.brand,
      cardholderName: dto.cardholderName,
      last4: cleanCardNumber.slice(-4),
      expiryMonth: dto.expiryMonth,
      expiryYear: dto.expiryYear,
      isDefault: shouldBeDefault,
    });

    const savedPaymentMethod =
      await this.paymentMethodsRepository.save(paymentMethod);

    return this.formatPaymentMethod(savedPaymentMethod);
  }

  async updatePaymentMethod(
    userId: number,
    paymentMethodId: number,
    dto: UpdatePaymentMethodDto,
  ) {
    const paymentMethod = await this.paymentMethodsRepository.findOne({
      where: {
        id: paymentMethodId,
        userId,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Moyen de paiement introuvable');
    }

    if (
      dto.expiryMonth !== undefined ||
      dto.expiryYear !== undefined
    ) {
      this.validateCardExpiration(
        dto.expiryMonth ?? paymentMethod.expiryMonth,
        dto.expiryYear ?? paymentMethod.expiryYear,
      );
    }

    if (dto.isDefault) {
      await this.paymentMethodsRepository.update(
        { userId },
        { isDefault: false },
      );
    }

    if (dto.brand !== undefined) {
      paymentMethod.brand = dto.brand;
    }

    if (dto.cardholderName !== undefined) {
      paymentMethod.cardholderName = dto.cardholderName;
    }

    if (dto.expiryMonth !== undefined) {
      paymentMethod.expiryMonth = dto.expiryMonth;
    }

    if (dto.expiryYear !== undefined) {
      paymentMethod.expiryYear = dto.expiryYear;
    }

    if (dto.isDefault !== undefined) {
      paymentMethod.isDefault = dto.isDefault;
    }

    const updatedPaymentMethod =
      await this.paymentMethodsRepository.save(paymentMethod);

    return this.formatPaymentMethod(updatedPaymentMethod);
  }

  async removePaymentMethod(userId: number, paymentMethodId: number) {
    const paymentMethod = await this.paymentMethodsRepository.findOne({
      where: {
        id: paymentMethodId,
        userId,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Moyen de paiement introuvable');
    }

    const wasDefault = paymentMethod.isDefault;

    await this.paymentMethodsRepository.remove(paymentMethod);

    if (wasDefault) {
      const nextPaymentMethod = await this.paymentMethodsRepository.findOne({
        where: {
          userId,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      if (nextPaymentMethod) {
        nextPaymentMethod.isDefault = true;
        await this.paymentMethodsRepository.save(nextPaymentMethod);
      }
    }

    return {
      message: 'Moyen de paiement supprimé avec succès',
    };
  }

  async setDefaultPaymentMethod(userId: number, paymentMethodId: number) {
    const paymentMethod = await this.paymentMethodsRepository.findOne({
      where: {
        id: paymentMethodId,
        userId,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Moyen de paiement introuvable');
    }

    await this.paymentMethodsRepository.update(
      { userId },
      { isDefault: false },
    );

    paymentMethod.isDefault = true;

    const updatedPaymentMethod =
      await this.paymentMethodsRepository.save(paymentMethod);

    return this.formatPaymentMethod(updatedPaymentMethod);
  }
}