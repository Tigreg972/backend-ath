import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

import { ProductTranslationLanguage } from '../../catalog/entities/product-translation.entity';

export class UpsertProductTranslationDto {
  @IsEnum(ProductTranslationLanguage)
  language!: ProductTranslationLanguage;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  techSpecs?: Record<string, any>;
}