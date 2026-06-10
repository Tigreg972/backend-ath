import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export type ChatbotLanguage = 'fr' | 'en' | 'ar' | 'he';

export class CreateChatbotMessageDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  @IsIn(['fr', 'en', 'ar', 'he'])
  language?: ChatbotLanguage;
}