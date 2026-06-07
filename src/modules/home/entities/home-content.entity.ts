import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('home_content')
export class HomeContent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'text',
  })
  homeText!: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}