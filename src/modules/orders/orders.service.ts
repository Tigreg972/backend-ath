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
import { User } from '../users/entities/user.entity';

import { CheckoutDto } from './dto/checkout.dto';
import { MailService } from '../mail/mail.service';
import { InvoicesService } from '../invoices/invoices.service';

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

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly mailService: MailService,
    private readonly invoicesService: InvoicesService,
  ) {}

  private buildReference(orderId: number) {
    return `ALT-${String(orderId).padStart(4, '0')}`;
  }

  private mapShippingAddress(address: Address | null) {
    if (!address) {
      return null;
    }

    return {
      id: address.id,
      firstName: address.firstName,
      lastName: address.lastName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      postalCode: address.postalCode,
      city: address.city,
      region: address.region,
      country: address.country,
      phone: address.phone,
    };
  }

  private mapOrderItem(item: OrderItem) {
    const firstImage = item.product?.images?.[0]?.url || '';

    return {
      id: item.id,
      productId: item.productId,
      name: item.productName,
      quantity: item.quantity,
      priceCents: item.unitPriceCents,
      totalCents: item.totalCents,
      imageUrl: firstImage,
      product: item.product
        ? {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            priceCents: item.product.priceCents,
            stock: item.product.stock,
            imageUrl: firstImage,
            images: item.product.images || [],
          }
        : null,
    };
  }

  private mapCartItem(item: CartItem) {
    const firstImage = item.product?.images?.[0]?.url || '';

    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        priceCents: item.product.priceCents,
        stock: item.product.stock,
        imageUrl: firstImage,
        images: item.product.images || [],
      },
    };
  }

  private async getCartResponse(userId: number) {
    const items = await this.cartItemsRepository.find({
      where: { userId },
    });

    const mappedItems = items.map((item) => this.mapCartItem(item));

    const totalItems = mappedItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const totalPriceCents = mappedItems.reduce(
      (sum, item) => sum + item.quantity * item.product.priceCents,
      0,
    );

    return {
      items: mappedItems,
      totalItems,
      totalPriceCents,
    };
  }

  private async mapOrder(order: Order) {
    let shippingAddress: Address | null = null;

    if (order.shippingAddressId) {
      shippingAddress = await this.addressesRepository.findOne({
        where: {
          id: order.shippingAddressId,
          userId: order.userId,
        },
      });
    }

    return {
      id: order.id,
      reference: this.buildReference(order.id),
      status: order.status,
      createdAt: order.createdAt,
      totalPriceCents: order.totalCents,
      paymentMethod: order.paymentMethod,
      shippingAddress: this.mapShippingAddress(shippingAddress),
      items: (order.items || []).map((item) => this.mapOrderItem(item)),
    };
  }

  async checkout(userId: number, dto: CheckoutDto) {
    const cartItems = await this.cartItemsRepository.find({
      where: { userId },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('CART_EMPTY');
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
        throw new NotFoundException('SHIPPING_ADDRESS_NOT_FOUND');
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
      totalCents: number;
      imageUrl: string;
    }[] = [];

    for (const cartItem of cartItems) {
      const product = await this.productsRepository.findOne({
        where: {
          id: cartItem.productId,
          isActive: true,
        },
      });

      if (!product) {
        throw new NotFoundException('PRODUCT_NOT_FOUND');
      }

      if (product.stock < cartItem.quantity) {
        throw new BadRequestException('INSUFFICIENT_STOCK');
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

      const imageUrl = product.images?.[0]?.url || '';

      responseItems.push({
        id: savedItem.id,
        productId: product.id,
        name: product.name,
        quantity: savedItem.quantity,
        priceCents: savedItem.unitPriceCents,
        totalCents: savedItem.totalCents,
        imageUrl,
      });

      product.stock -= cartItem.quantity;
      await this.productsRepository.save(product);
    }

    savedOrder.totalCents = totalPriceCents;
    await this.ordersRepository.save(savedOrder);

    await this.cartItemsRepository.delete({ userId });

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (user) {
      const reference = this.buildReference(savedOrder.id);

      const invoicePdf = await this.invoicesService.generateInvoice(
        savedOrder.id,
        userId,
      );

      await this.mailService.sendOrderConfirmationEmail(
        user.email,
        user.fullName,
        reference,
        totalPriceCents,
        invoicePdf,
      );
    }

    return {
      id: savedOrder.id,
      reference: this.buildReference(savedOrder.id),
      status: savedOrder.status,
      createdAt: savedOrder.createdAt,
      totalPriceCents,
      items: responseItems,
      shippingAddress: this.mapShippingAddress(shippingAddress),
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

    const mappedOrders = await Promise.all(
      orders.map((order) => this.mapOrder(order)),
    );

    return mappedOrders;
  }

  async findOrderById(userId: number, orderId: number) {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('ORDER_NOT_FOUND');
    }

    return this.mapOrder(order);
  }

  async reorder(userId: number, orderId: number) {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('ORDER_NOT_FOUND');
    }

    const orderItems = await this.orderItemsRepository.find({
      where: {
        orderId: order.id,
      },
    });

    if (orderItems.length === 0) {
      throw new BadRequestException('ORDER_EMPTY');
    }

    const unavailableProducts: {
      productId: number;
      name: string;
      reason: string;
    }[] = [];

    const addedProducts: {
      productId: number;
      name: string;
      quantity: number;
    }[] = [];

    for (const orderItem of orderItems) {
      const product = await this.productsRepository.findOne({
        where: {
          id: orderItem.productId,
          isActive: true,
        },
      });

      if (!product) {
        unavailableProducts.push({
          productId: orderItem.productId,
          name: orderItem.productName,
          reason: 'PRODUCT_NOT_FOUND_OR_INACTIVE',
        });
        continue;
      }

      if (product.stock <= 0) {
        unavailableProducts.push({
          productId: product.id,
          name: product.name,
          reason: 'OUT_OF_STOCK',
        });
        continue;
      }

      const quantityToAdd = Math.min(orderItem.quantity, product.stock);

      let cartItem = await this.cartItemsRepository.findOne({
        where: {
          userId,
          productId: product.id,
        },
      });

      if (cartItem) {
        const newQuantity = Math.min(
          cartItem.quantity + quantityToAdd,
          product.stock,
        );

        cartItem.quantity = newQuantity;
      } else {
        cartItem = this.cartItemsRepository.create({
          userId,
          productId: product.id,
          quantity: quantityToAdd,
        });
      }

      await this.cartItemsRepository.save(cartItem);

      addedProducts.push({
        productId: product.id,
        name: product.name,
        quantity: quantityToAdd,
      });
    }

    if (addedProducts.length === 0) {
      throw new BadRequestException('NO_PRODUCT_AVAILABLE_FOR_REORDER');
    }

    const cart = await this.getCartResponse(userId);

    return {
      message: 'REORDER_SUCCESS',
      addedProducts,
      unavailableProducts,
      cart,
    };
  }
}