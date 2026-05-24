import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Order } from './order.entity';
import { Product } from '../../catalog/entities/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  order!: Order;

  @Column()
  orderId!: number;

  @ManyToOne(() => Product, {
    eager: true,
    nullable: false,
  })
  product!: Product;

  @Column()
  productId!: number;

  @Column()
  productName!: string;

  @Column()
  unitPriceCents!: number;

  @Column()
  quantity!: number;

  @Column()
  totalCents!: number;
}