import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ContactStatus {
  PENDING = 'pending',
  ANSWERED = 'answered',
}

@Entity('contact_messages')
export class ContactMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  email!: string;

  @Column()
  subject!: string;

  @Column({
    type: 'text',
  })
  message!: string;

  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.PENDING,
  })
  status!: ContactStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  replyMessage?: string;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  repliedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;
}