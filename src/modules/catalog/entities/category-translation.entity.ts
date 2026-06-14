import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Category } from './category.entity';

export enum CategoryTranslationLanguage {
  FR = 'fr',
  EN = 'en',
  AR = 'ar',
  HE = 'he',
}

@Entity('category_translations')
@Unique(['categoryId', 'language'])
export class CategoryTranslation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  categoryId!: number;

  @ManyToOne(() => Category, (category) => category.translations, {
    onDelete: 'CASCADE',
  })
  category!: Category;

  @Column({
    type: 'enum',
    enum: CategoryTranslationLanguage,
  })
  language!: CategoryTranslationLanguage;

  @Column()
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}