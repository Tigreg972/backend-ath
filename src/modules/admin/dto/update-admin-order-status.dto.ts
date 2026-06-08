import { IsIn, IsString } from 'class-validator';

export class UpdateAdminOrderStatusDto {
  @IsString()
  @IsIn([
    'pending',
    'confirmed',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ])
  status!: string;
}