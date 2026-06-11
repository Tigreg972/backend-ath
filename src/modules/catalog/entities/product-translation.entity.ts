import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Product } from './product.entity';

export enum ProductTranslationLanguage {
  FR = 'fr',
  EN = 'en',
  AR = 'ar',
  HE = 'he',
}

@Entity('product_translations')
@Unique(['productId', 'language'])
export class ProductTranslation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  productId!: number;

  @ManyToOne(() => Product, (product) => product.translations, {
    onDelete: 'CASCADE',
  })
  product!: Product;

  @Column({
    type: 'enum',
    enum: ProductTranslationLanguage,
  })
  language!: ProductTranslationLanguage;

  @Column()
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  shortDescription?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'json',
    nullable: true,
  })
  techSpecs?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}