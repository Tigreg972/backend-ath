import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { HomeSlide } from './entities/home-slide.entity';
import { HomeContent } from './entities/home-content.entity';

import { CreateHomeSlideDto } from './dto/create-home-slide.dto';
import { UpdateHomeSlideDto } from './dto/update-home-slide.dto';
import { UpdateHomeContentDto } from './dto/update-home-content.dto';

@Injectable()
export class HomeService {
  constructor(
    @InjectRepository(HomeSlide)
    private readonly slidesRepository: Repository<HomeSlide>,

    @InjectRepository(HomeContent)
    private readonly contentRepository: Repository<HomeContent>,
  ) {}

  async getPublicSlides() {
    return this.slidesRepository.find({
      where: {
        isActive: true,
      },
      order: {
        displayOrder: 'ASC',
      },
    });
  }

  async getAdminSlides() {
    return this.slidesRepository.find({
      order: {
        displayOrder: 'ASC',
      },
    });
  }

  async createSlide(dto: CreateHomeSlideDto) {
    const slide = this.slidesRepository.create({
      title: dto.title,
      subtitle: dto.subtitle,
      imageUrl: dto.imageUrl,
      ctaLabel: dto.ctaLabel,
      ctaUrl: dto.ctaUrl,
      displayOrder: dto.displayOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    return this.slidesRepository.save(slide);
  }

  async updateSlide(id: number, dto: UpdateHomeSlideDto) {
    const slide = await this.slidesRepository.findOne({
      where: { id },
    });

    if (!slide) {
      throw new NotFoundException('Slide introuvable');
    }

    Object.assign(slide, dto);

    return this.slidesRepository.save(slide);
  }

  async deleteSlide(id: number) {
    const slide = await this.slidesRepository.findOne({
      where: { id },
    });

    if (!slide) {
      throw new NotFoundException('Slide introuvable');
    }

    await this.slidesRepository.remove(slide);

    return {
      message: 'Slide supprimé avec succès',
    };
  }

  async getHomeContent() {
    let content = await this.contentRepository.findOne({
      where: { id: 1 },
    });

    if (!content) {
      content = this.contentRepository.create({
        id: 1,
        homeText:
          'Découvrez notre sélection de matériel médical professionnel.',
      });

      await this.contentRepository.save(content);
    }

    return content;
  }

  async updateHomeContent(dto: UpdateHomeContentDto) {
    const content = await this.getHomeContent();

    content.homeText = dto.homeText;

    return this.contentRepository.save(content);
  }
}