import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

import { PaymentMethodBrand } from '../entities/payment-method.entity';

export class CreatePaymentMethodDto {
  @IsEnum(PaymentMethodBrand)
  brand!: PaymentMethodBrand;

  @IsString()
  cardholderName!: string;

  @IsString()
  @Length(12, 19)
  cardNumber!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth!: number;

  @IsInt()
  @Min(2026)
  @Max(2100)
  expiryYear!: number;

  @IsString()
  @Length(3, 4)
  cvv!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}