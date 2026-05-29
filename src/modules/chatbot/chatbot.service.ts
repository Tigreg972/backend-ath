import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import OpenAI from 'openai';

import { ChatbotMessage } from './entities/chatbot-message.entity';
import { CreateChatbotMessageDto } from './dto/create-chatbot-message.dto';

@Injectable()
export class ChatbotService {
  private readonly groq: OpenAI | null = null;

  constructor(
    @InjectRepository(ChatbotMessage)
    private readonly chatbotRepository: Repository<ChatbotMessage>,

    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');

    if (apiKey) {
      this.groq = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    }
  }

  private getFallbackReply(): string {
    return 'Désolé, l’assistant est momentanément indisponible. Vous pouvez contacter notre équipe via le formulaire de contact.';
  }

  private async generateAiReply(message: string): Promise<string> {
    if (!this.groq) {
      return this.getFallbackReply();
    }

    try {
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              "Tu es l'assistant du site e-commerce Althea Shop, spécialisé dans la vente de matériel médical. Tu aides les clients sur les produits, les commandes, la livraison, le paiement, les factures, le compte utilisateur et le support. Tu réponds toujours en français, de manière claire, courte, professionnelle et rassurante. Tu ne dois jamais inventer de numéro de commande, de prix, de stock, de délai précis ou d'information personnelle. Si tu n'as pas l'information, tu invites le client à contacter l'équipe via le formulaire de contact.",
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.4,
        max_tokens: 250,
      });

      return (
        response.choices[0]?.message?.content ||
        this.getFallbackReply()
      );
    } catch (error) {
      console.error('Erreur Groq chatbot:', error);

      return this.getFallbackReply();
    }
  }

  async create(dto: CreateChatbotMessageDto) {
    const reply = await this.generateAiReply(dto.message);

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