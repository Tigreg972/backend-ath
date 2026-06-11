import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import type { ChatbotLanguage } from './create-chatbot-message.dto';

export class EscalateChatbotMessageDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  @IsIn(['fr', 'en', 'ar', 'he'])
  language?: ChatbotLanguage;
}