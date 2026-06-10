import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from './user.entity';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.paymentMethods, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user!: User;

  @Column()
  userId!: number;

  @Column()
  cardName!: string;

  @Column()
  last4!: string;

  @Column()
  expiry!: string;

  @Column({ default: 'cb' })
  brand!: string;

  @Column({ default: false })
  isDefault!: boolean;

  @Column({ nullable: true })
  stripePaymentMethodId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}