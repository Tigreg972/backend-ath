import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Address } from './address.entity';
import { PaymentMethod } from './payment-method.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  fullName!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role!: UserRole;

  @Column({ default: false })
  isEmailConfirmed!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  resetPasswordToken?: string;

  @Column({ type: 'datetime', nullable: true })
  resetPasswordExpiresAt?: Date;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ type: 'datetime', nullable: true })
  emailVerificationExpiresAt?: Date;

  @Column({ nullable: true })
  pendingEmail?: string;

  @Column({ nullable: true })
  emailChangeToken?: string;

  @Column({ type: 'datetime', nullable: true })
  emailChangeExpiresAt?: Date;

  @Column({ nullable: true })
  adminTwoFactorCode?: string;

  @Column({ type: 'datetime', nullable: true })
  adminTwoFactorExpiresAt?: Date;

  @Column({ default: false })
  adminTwoFactorRememberMe!: boolean;

  @OneToMany(() => Address, (address) => address.user)
  addresses!: Address[];

  @OneToMany(() => PaymentMethod, (paymentMethod) => paymentMethod.user)
  paymentMethods!: PaymentMethod[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}