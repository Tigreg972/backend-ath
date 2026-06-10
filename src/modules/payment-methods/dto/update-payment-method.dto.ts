import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { PaymentMethodBrand } from '../entities/payment-method.entity';

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsEnum(PaymentMethodBrand)
  brand?: PaymentMethodBrand;

  @IsOptional()
  @IsString()
  cardholderName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(2026)
  @Max(2100)
  expiryYear?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}