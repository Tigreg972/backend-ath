import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ContactMessage,
  ContactStatus,
} from './entities/contact-message.entity';

import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { ReplyContactMessageDto } from './dto/reply-contact-message.dto';

import { MailService } from '../mail/mail.service';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly contactRepository: Repository<ContactMessage>,

    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateContactMessageDto) {
    const message = this.contactRepository.create({
      ...dto,
      status: ContactStatus.PENDING,
    });

    await this.contactRepository.save(message);

    await this.mailService.sendContactConfirmationEmail(
      dto.email,
      dto.firstName,
      dto.subject,
    );

    return {
      message: 'Message envoyé avec succès',
    };
  }

  async findAll() {
    return this.contactRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async reply(id: number, dto: ReplyContactMessageDto) {
    const contactMessage = await this.contactRepository.findOne({
      where: { id },
    });

    if (!contactMessage) {
      throw new NotFoundException('Message introuvable');
    }

    contactMessage.replyMessage = dto.reply;
    contactMessage.status = ContactStatus.ANSWERED;
    contactMessage.repliedAt = new Date();

    await this.contactRepository.save(contactMessage);

    await this.mailService.sendContactReplyEmail(
      contactMessage.email,
      contactMessage.firstName,
      contactMessage.subject,
      dto.reply,
    );

    return {
      message: 'Réponse envoyée avec succès',
    };
  }

  async remove(id: number) {
    const message = await this.contactRepository.findOne({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException('Message introuvable');
    }

    await this.contactRepository.remove(message);

    return {
      message: 'Message supprimé avec succès',
    };
  }
}