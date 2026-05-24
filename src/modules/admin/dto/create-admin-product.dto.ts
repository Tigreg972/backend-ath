import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAdminProductDto {
  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  shortDescription!: string;

  @IsString()
  description!: string;

  @IsObject()
  techSpecs!: Record<string, any>;

  @IsNumber()
  @Min(0)
  priceCents!: number;

  @IsNumber()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsNumber()
  categoryId!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  images?: any[];
}