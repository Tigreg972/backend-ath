import { IsNumber, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNumber()
  @Min(50)
  amountCents!: number;
}