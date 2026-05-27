import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
  ) {}

  @Post()
  create(@Body() dto: CreateContactMessageDto) {
    return this.contactService.create(dto);
  }

  @Get()
  findAll() {
    return this.contactService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contactService.remove(Number(id));
  }
}