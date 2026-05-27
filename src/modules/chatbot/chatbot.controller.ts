import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { ChatbotService } from './chatbot.service';
import { CreateChatbotMessageDto } from './dto/create-chatbot-message.dto';

@ApiTags('Chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
  ) {}

  @Post('message')
  create(@Body() dto: CreateChatbotMessageDto) {
    return this.chatbotService.create(dto);
  }

  @Get('messages')
  findAll() {
    return this.chatbotService.findAll();
  }
}