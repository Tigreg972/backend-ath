import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { ChatbotService } from './chatbot.service';
import { CreateChatbotMessageDto } from './dto/create-chatbot-message.dto';
import { EscalateChatbotMessageDto } from './dto/escalate-chatbot-message.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
  ) {}

  @Post('message')
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateChatbotMessageDto,
  ) {
    return this.chatbotService.create(user.id, dto);
  }

  @Post('escalate')
  escalate(
    @CurrentUser() user: any,
    @Body() dto: EscalateChatbotMessageDto,
  ) {
    return this.chatbotService.escalate(user.id, dto);
  }

  @Get('messages')
  findMyMessages(@CurrentUser() user: any) {
    return this.chatbotService.findMyMessages(user.id);
  }
}