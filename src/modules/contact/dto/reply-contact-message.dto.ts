import { IsNotEmpty } from 'class-validator';

export class ReplyContactMessageDto {
  @IsNotEmpty()
  reply!: string;
}