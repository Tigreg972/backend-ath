import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  addressLine1!: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsString()
  city!: string;

  @IsString()
  region!: string;

  @IsString()
  postalCode!: string;

  @IsString()
  country!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}