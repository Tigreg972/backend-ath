import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

@Entity('chatbot_messages')
export class ChatbotMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  user!: User;

  @Column({
    type: 'text',
  })
  message!: string;

  @Column({
    type: 'text',
  })
  reply!: string;

  @CreateDateColumn()
  createdAt!: Date;
}