import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { Product } from '../catalog/entities/product.entity';
import { ProductImage } from '../catalog/entities/product-image.entity';
import { ProductTranslation } from '../catalog/entities/product-translation.entity';
import { Category } from '../catalog/entities/category.entity';

import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

import { User } from '../users/entities/user.entity';
import { Address } from '../users/entities/address.entity';

import { HomeModule } from '../home/home.module';
import { ContactModule } from '../contact/contact.module';
import { ChatbotModule } from '../chatbot/chatbot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductImage,
      ProductTranslation,
      Category,
      Order,
      OrderItem,
      User,
      Address,
    ]),
    HomeModule,
    ContactModule,
    ChatbotModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}