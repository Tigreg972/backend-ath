import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InvoicesService } from './invoices.service';

import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { User } from '../users/entities/user.entity';
import { Address } from '../users/entities/address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, User, Address])],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}