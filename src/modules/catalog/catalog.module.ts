import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

import { Category } from './entities/category.entity';
import { CategoryTranslation } from './entities/category-translation.entity';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductTranslation } from './entities/product-translation.entity';

import { HomeModule } from '../home/home.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      CategoryTranslation,
      Product,
      ProductImage,
      ProductTranslation,
    ]),
    HomeModule,
  ],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}