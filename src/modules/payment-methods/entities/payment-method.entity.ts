import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

export enum PaymentMethodBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  CB = 'cb',
  AMEX = 'amex',
  OTHER = 'other',
}

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user!: User;

  @Column()
  userId!: number;

  @Column({
    type: 'enum',
    enum: PaymentMethodBrand,
    default: PaymentMethodBrand.OTHER,
  })
  brand!: PaymentMethodBrand;

  @Column()
  cardholderName!: string;

  @Column()
  last4!: string;

  @Column()
  expiryMonth!: number;

  @Column()
  expiryYear!: number;

  @Column({ nullable: true })
  stripePaymentMethodId?: string;

  @Column({ default: false })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}