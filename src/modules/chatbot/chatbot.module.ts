import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

import { ChatbotMessage } from './entities/chatbot-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatbotMessage])],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}