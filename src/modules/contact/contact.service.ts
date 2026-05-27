import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ContactMessage } from './entities/contact-message.entity';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly contactRepository: Repository<ContactMessage>,
  ) {}

  async create(dto: CreateContactMessageDto) {
    const message = this.contactRepository.create(dto);

    await this.contactRepository.save(message);

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