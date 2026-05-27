import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateContactMessageDto {
  @IsNotEmpty()
  firstName!: string;

  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  subject!: string;

  @IsNotEmpty()
  message!: string;
}