import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HomeService } from './home.service';

import { HomeSlide } from './entities/home-slide.entity';
import { HomeContent } from './entities/home-content.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HomeSlide,
      HomeContent,
    ]),
  ],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}