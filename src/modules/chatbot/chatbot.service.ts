import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import OpenAI from 'openai';

import {
  ChatbotMessage,
  ChatbotSupportStatus,
} from './entities/chatbot-message.entity';

import {
  ChatbotLanguage,
  CreateChatbotMessageDto,
} from './dto/create-chatbot-message.dto';

import { EscalateChatbotMessageDto } from './dto/escalate-chatbot-message.dto';

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

  private normalizeLanguage(language?: string): ChatbotLanguage {
    const shortLanguage = language?.split('-')[0];

    if (
      shortLanguage === 'fr' ||
      shortLanguage === 'en' ||
      shortLanguage === 'ar' ||
      shortLanguage === 'he'
    ) {
      return shortLanguage;
    }

    return 'fr';
  }

  private detectLanguageFromMessage(message: string): ChatbotLanguage | null {
    const text = message.trim();

    if (!text) return null;

    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/[\u0590-\u05FF]/.test(text)) return 'he';

    const lowerText = text.toLowerCase();

    const englishWords = [
      'hello',
      'hi',
      'where',
      'order',
      'payment',
      'invoice',
      'delivery',
      'account',
      'product',
      'price',
      'stock',
      'help',
      'thanks',
      'thank you',
    ];

    const frenchWords = [
      'bonjour',
      'salut',
      'commande',
      'paiement',
      'facture',
      'livraison',
      'compte',
      'produit',
      'prix',
      'stock',
      'aide',
      'merci',
      'où',
      'est',
      'ma',
      'mon',
    ];

    const englishScore = englishWords.filter((word) =>
      lowerText.includes(word),
    ).length;

    const frenchScore = frenchWords.filter((word) =>
      lowerText.includes(word),
    ).length;

    if (englishScore > frenchScore) return 'en';
    if (frenchScore > englishScore) return 'fr';

    return null;
  }

  private resolveReplyLanguage(
    siteLanguage?: string,
    message?: string,
  ): ChatbotLanguage {
    const normalizedSiteLanguage = this.normalizeLanguage(siteLanguage);
    const detectedMessageLanguage = message
      ? this.detectLanguageFromMessage(message)
      : null;

    return detectedMessageLanguage || normalizedSiteLanguage || 'fr';
  }

  private getLanguageLabel(language: ChatbotLanguage): string {
    const labels: Record<ChatbotLanguage, string> = {
      fr: 'French',
      en: 'English',
      ar: 'Arabic',
      he: 'Hebrew',
    };

    return labels[language];
  }

  private getFallbackReply(language: ChatbotLanguage): string {
    const replies: Record<ChatbotLanguage, string> = {
      fr: 'Désolé, l’assistant est momentanément indisponible. Vous pouvez contacter notre équipe via le formulaire de contact.',
      en: 'Sorry, the assistant is temporarily unavailable. You can contact our team using the contact form.',
      ar: 'عذرًا، المساعد غير متاح مؤقتًا. يمكنك التواصل مع فريقنا عبر نموذج الاتصال.',
      he: 'מצטערים, העוזר אינו זמין כרגע. ניתן ליצור קשר עם הצוות שלנו דרך טופס יצירת הקשר.',
    };

    return replies[language];
  }

  private getEscalationReply(language: ChatbotLanguage): string {
    const replies: Record<ChatbotLanguage, string> = {
      fr: 'Votre demande a été transmise à notre équipe support. Un administrateur pourra la consulter depuis le back-office.',
      en: 'Your request has been forwarded to our support team. An administrator will be able to review it from the back office.',
      ar: 'تم إرسال طلبك إلى فريق الدعم. سيتمكن أحد المسؤولين من مراجعته من لوحة الإدارة.',
      he: 'הבקשה שלך הועברה לצוות התמיכה. מנהל יוכל לבדוק אותה ממערכת הניהול.',
    };

    return replies[language];
  }

  private buildSystemPrompt(language: ChatbotLanguage): string {
    const languageLabel = this.getLanguageLabel(language);

    return `
You are the Althea Shop assistant, an e-commerce assistant specialized in medical equipment.

You must always answer in ${languageLabel}.
Never answer in another language.

Supported languages:
- fr = French
- en = English
- ar = Arabic
- he = Hebrew

Your role:
- Help users with products, orders, delivery, payment, invoices, account management and support.
- Give short, clear, professional and reassuring answers.
- Adapt the tone to an e-commerce medical equipment platform.

Important rules:
- Never invent an order number.
- Never invent a price.
- Never invent stock availability.
- Never invent delivery dates.
- Never invent personal information.
- If you do not have the information, invite the user to contact the team through the contact form or ask to speak with a human support agent.
- Do not ask for sensitive banking data.
- Do not ask for a full card number or CVV.
`.trim();
  }

  private async generateAiReply(
    message: string,
    language: ChatbotLanguage,
  ): Promise<string> {
    if (!this.groq) {
      return this.getFallbackReply(language);
    }

    try {
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(language),
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
        this.getFallbackReply(language)
      );
    } catch (error) {
      console.error('Erreur Groq chatbot:', error);
      return this.getFallbackReply(language);
    }
  }

  async create(userId: number, dto: CreateChatbotMessageDto) {
    const language = this.resolveReplyLanguage(dto.language, dto.message);
    const reply = await this.generateAiReply(dto.message, language);

    const message = this.chatbotRepository.create({
      userId,
      message: dto.message,
      reply,
      needsHumanSupport: false,
      supportStatus: ChatbotSupportStatus.NONE,
    });

    await this.chatbotRepository.save(message);

    return {
      reply,
      language,
    };
  }

  async escalate(userId: number, dto: EscalateChatbotMessageDto) {
    const language = this.resolveReplyLanguage(dto.language, dto.message);
    const reply = this.getEscalationReply(language);

    const message = this.chatbotRepository.create({
      userId,
      message: dto.message,
      reply,
      needsHumanSupport: true,
      supportStatus: ChatbotSupportStatus.PENDING,
      supportSubject: dto.subject || 'Demande transférée au support',
      supportRequestedAt: new Date(),
    });

    const savedMessage = await this.chatbotRepository.save(message);

    return {
      message: 'CHATBOT_ESCALATION_CREATED',
      reply,
      language,
      escalation: {
        id: savedMessage.id,
        status: savedMessage.supportStatus,
        subject: savedMessage.supportSubject,
        createdAt: savedMessage.createdAt,
      },
    };
  }

  async findMyMessages(userId: number) {
    return this.chatbotRepository.find({
      where: {
        userId,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findAllForAdmin(page = 1, limit = 20) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const [messages, total] = await this.chatbotRepository.findAndCount({
      relations: {
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      items: messages.map((message) => ({
        id: message.id,
        userId: message.userId,
        userEmail: message.user?.email || null,
        userFullName: message.user?.fullName || null,
        message: message.message,
        reply: message.reply,
        needsHumanSupport: message.needsHumanSupport,
        supportStatus: message.supportStatus,
        supportSubject: message.supportSubject,
        supportRequestedAt: message.supportRequestedAt,
        supportResolvedAt: message.supportResolvedAt,
        createdAt: message.createdAt,
      })),
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async findEscalationsForAdmin(page = 1, limit = 20) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const [messages, total] = await this.chatbotRepository.findAndCount({
      where: {
        needsHumanSupport: true,
      },
      relations: {
        user: true,
      },
      order: {
        supportRequestedAt: 'DESC',
        createdAt: 'DESC',
      },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      items: messages.map((message) => ({
        id: message.id,
        userId: message.userId,
        userEmail: message.user?.email || null,
        userFullName: message.user?.fullName || null,
        message: message.message,
        reply: message.reply,
        supportStatus: message.supportStatus,
        supportSubject: message.supportSubject,
        supportRequestedAt: message.supportRequestedAt,
        supportResolvedAt: message.supportResolvedAt,
        createdAt: message.createdAt,
      })),
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async resolveEscalation(messageId: number) {
    const message = await this.chatbotRepository.findOne({
      where: {
        id: messageId,
        needsHumanSupport: true,
      },
    });

    if (!message) {
      throw new NotFoundException('CHATBOT_ESCALATION_NOT_FOUND');
    }

    message.supportStatus = ChatbotSupportStatus.RESOLVED;
    message.supportResolvedAt = new Date();

    const savedMessage = await this.chatbotRepository.save(message);

    return {
      message: 'CHATBOT_ESCALATION_RESOLVED',
      escalation: {
        id: savedMessage.id,
        status: savedMessage.supportStatus,
        resolvedAt: savedMessage.supportResolvedAt,
      },
    };
  }
}