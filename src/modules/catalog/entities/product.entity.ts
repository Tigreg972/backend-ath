import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Category } from './category.entity';
import { ProductImage } from './product-image.entity';
import { ProductTranslation } from './product-translation.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  sku!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  shortDescription?: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'json', nullable: true })
  techSpecs?: Record<string, any>;

  @Column()
  priceCents!: number;

  @Column({ default: 0 })
  stock!: number;

  @Column({ default: 0 })
  priority!: number;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isFeatured!: boolean;

  @ManyToOne(() => Category, (category) => category.products, {
    eager: true,
    nullable: false,
  })
  category!: Category;

  @Column()
  categoryId!: number;

  @OneToMany(() => ProductImage, (image) => image.product, {
    eager: true,
    cascade: true,
  })
  images!: ProductImage[];

  @OneToMany(
    () => ProductTranslation,
    (translation) => translation.product,
    {
      cascade: true,
    },
  )
  translations!: ProductTranslation[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}