import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  cardName?: string;

  @IsOptional()
  @IsString()
  @Length(12, 19)
  cardNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
  expiry?: string;

  @IsOptional()
  @IsString()
  @IsIn(['cb', 'visa', 'mastercard', 'amex'])
  brand?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}