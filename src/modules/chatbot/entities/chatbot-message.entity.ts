import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('chatbot_messages')
export class ChatbotMessage {
  @PrimaryGeneratedColumn()
  id!: number;

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