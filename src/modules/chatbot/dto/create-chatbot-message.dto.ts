import { IsNotEmpty } from 'class-validator';

export class CreateChatbotMessageDto {
  @IsNotEmpty()
  message!: string;
}