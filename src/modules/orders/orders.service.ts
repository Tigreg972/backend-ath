import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../catalog/entities/product.entity';
import { Address } from '../users/entities/address.entity';

import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,

    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
  ) {}

  private buildReference(orderId: number) {
    return `ALT-${String(orderId).padStart(4, '0')}`;
  }

  async checkout(userId: number, dto: CheckoutDto) {
    const cartItems = await this.cartItemsRepository.find({
      where: { userId },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Panier vide');
    }

    let shippingAddress: Address | null = null;

    if (dto.shippingAddressId) {
      shippingAddress = await this.addressesRepository.findOne({
        where: {
          id: dto.shippingAddressId,
          userId,
        },
      });

      if (!shippingAddress) {
        throw new NotFoundException('Adresse de livraison introuvable');
      }
    }

    const order = this.ordersRepository.create({
      userId,
      status: OrderStatus.CONFIRMED,
      paymentMethod: dto.paymentMethod,
      shippingAddressId: dto.shippingAddressId,
      totalCents: 0,
    });

    const savedOrder = await this.ordersRepository.save(order);

    let totalPriceCents = 0;

    const responseItems: {
      id: number;
      productId: number;
      name: string;
      quantity: number;
      priceCents: number;
    }[] = [];

    for (const cartItem of cartItems) {
      const product = await this.productsRepository.findOne({
        where: {
          id: cartItem.productId,
          isActive: true,
        },
      });

      if (!product) {
        throw new NotFoundException(`Produit ${cartItem.productId} introuvable`);
      }

      if (product.stock < cartItem.quantity) {
        throw new BadRequestException(`Stock insuffisant pour ${product.name}`);
      }

      const itemTotalCents = product.priceCents * cartItem.quantity;
      totalPriceCents += itemTotalCents;

      const orderItem = this.orderItemsRepository.create({
        orderId: savedOrder.id,
        productId: product.id,
        productName: product.name,
        quantity: cartItem.quantity,
        unitPriceCents: product.priceCents,
        totalCents: itemTotalCents,
      });

      const savedItem = await this.orderItemsRepository.save(orderItem);

      responseItems.push({
        id: savedItem.id,
        productId: product.id,
        name: product.name,
        quantity: savedItem.quantity,
        priceCents: savedItem.unitPriceCents,
      });

      product.stock -= cartItem.quantity;
      await this.productsRepository.save(product);
    }

    savedOrder.totalCents = totalPriceCents;
    await this.ordersRepository.save(savedOrder);

    await this.cartItemsRepository.delete({ userId });

    return {
      id: savedOrder.id,
      reference: this.buildReference(savedOrder.id),
      status: savedOrder.status,
      createdAt: savedOrder.createdAt,
      totalPriceCents,
      items: responseItems,
      shippingAddress: shippingAddress
        ? {
            addressLine1: shippingAddress.addressLine1,
            postalCode: shippingAddress.postalCode,
            city: shippingAddress.city,
            country: shippingAddress.country,
          }
        : null,
      paymentMethod: savedOrder.paymentMethod,
    };
  }

  async findMyOrders(userId: number) {
    const orders = await this.ordersRepository.find({
      where: { userId },
      order: {
        createdAt: 'DESC',
      },
    });

    return orders.map((order) => ({
      id: order.id,
      reference: this.buildReference(order.id),
      status: order.status,
      createdAt: order.createdAt,
      totalPriceCents: order.totalCents,
      paymentMethod: order.paymentMethod,
    }));
  }

  async findOrderById(userId: number, orderId: number) {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    return {
      id: order.id,
      reference: this.buildReference(order.id),
      status: order.status,
      createdAt: order.createdAt,
      totalPriceCents: order.totalCents,
      paymentMethod: order.paymentMethod,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        priceCents: item.unitPriceCents,
      })),
    };
  }
}