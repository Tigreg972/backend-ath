import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChatbotMessage } from './entities/chatbot-message.entity';
import { CreateChatbotMessageDto } from './dto/create-chatbot-message.dto';

@Injectable()
export class ChatbotService {
  constructor(
    @InjectRepository(ChatbotMessage)
    private readonly chatbotRepository: Repository<ChatbotMessage>,
  ) {}

  private generateReply(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('commande')) {
      return 'Votre commande est en préparation.';
    }

    if (lower.includes('livraison')) {
      return 'Les délais de livraison sont de 2 à 5 jours ouvrés.';
    }

    if (lower.includes('bonjour')) {
      return 'Bonjour, comment puis-je vous aider ?';
    }

    return 'Merci pour votre message. Un conseiller pourra vous répondre prochainement.';
  }

  async create(dto: CreateChatbotMessageDto) {
    const reply = this.generateReply(dto.message);

    const message = this.chatbotRepository.create({
      message: dto.message,
      reply,
    });

    await this.chatbotRepository.save(message);

    return {
      reply,
    };
  }

  async findAll() {
    return this.chatbotRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }
}