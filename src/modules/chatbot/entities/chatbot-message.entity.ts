import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

export enum ChatbotSupportStatus {
  NONE = 'none',
  PENDING = 'pending',
  RESOLVED = 'resolved',
}

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

  @Column({ default: false })
  needsHumanSupport!: boolean;

  @Column({
    type: 'enum',
    enum: ChatbotSupportStatus,
    default: ChatbotSupportStatus.NONE,
  })
  supportStatus!: ChatbotSupportStatus;

  @Column({ nullable: true })
  supportSubject?: string;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  supportRequestedAt?: Date;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  supportResolvedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;
}