import {
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CheckoutDto {
  @IsOptional()
  @IsNumber()
  shippingAddressId?: number;

  @IsString()
  paymentMethod!: string;
}