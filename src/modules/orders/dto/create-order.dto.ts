import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string;

  @IsOptional()
  @IsNumber()
  billingAddressId?: number;

  @IsOptional()
  @IsNumber()
  shippingAddressId?: number;
}