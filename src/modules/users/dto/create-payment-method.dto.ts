import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  cardName!: string;

  @IsString()
  @Length(12, 19)
  cardNumber!: string;

  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
  expiry!: string;

  @IsString()
  @IsIn(['cb', 'visa', 'mastercard', 'amex'])
  brand!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}