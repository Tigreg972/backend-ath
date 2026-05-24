import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CartItem } from './entities/cart-item.entity';
import { Product } from '../catalog/entities/product.entity';

import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  private mapItem(item: CartItem) {
    const firstImage = item.product.images?.[0]?.url || '';

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

  async getCart(userId: number) {
    const items = await this.cartItemsRepository.find({
      where: { userId },
    });

    const mappedItems = items.map((item) => this.mapItem(item));

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

  async addToCart(userId: number, dto: AddToCartDto) {
    const product = await this.productsRepository.findOne({
      where: {
        id: dto.productId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    if (dto.quantity > product.stock) {
      throw new BadRequestException('Stock insuffisant');
    }

    let item = await this.cartItemsRepository.findOne({
      where: {
        userId,
        productId: dto.productId,
      },
    });

    if (item) {
      item.quantity += dto.quantity;
    } else {
      item = this.cartItemsRepository.create({
        userId,
        productId: dto.productId,
        quantity: dto.quantity,
      });
    }

    await this.cartItemsRepository.save(item);

    return this.getCart(userId);
  }

  async updateItem(
    userId: number,
    itemId: number,
    dto: UpdateCartItemDto,
  ) {
    const item = await this.cartItemsRepository.findOne({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!item) {
      throw new NotFoundException('Article introuvable');
    }

    if (dto.quantity > item.product.stock) {
      throw new BadRequestException('Stock insuffisant');
    }

    item.quantity = dto.quantity;

    await this.cartItemsRepository.save(item);

    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number) {
    const item = await this.cartItemsRepository.findOne({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!item) {
      throw new NotFoundException('Article introuvable');
    }

    await this.cartItemsRepository.remove(item);

    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    await this.cartItemsRepository.delete({ userId });

    return {
      items: [],
      totalItems: 0,
      totalPriceCents: 0,
    };
  }
}