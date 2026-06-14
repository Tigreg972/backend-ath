import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Product } from '../catalog/entities/product.entity';
import { ProductImage } from '../catalog/entities/product-image.entity';
import { ProductTranslation } from '../catalog/entities/product-translation.entity';
import { Category } from '../catalog/entities/category.entity';

import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

import { User } from '../users/entities/user.entity';
import { Address } from '../users/entities/address.entity';

import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';

import { CreateAdminCategoryDto } from './dto/create-admin-category.dto';
import { UpdateAdminCategoryDto } from './dto/update-admin-category.dto';

import { UpdateAdminOrderStatusDto } from './dto/update-admin-order-status.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpsertProductTranslationDto } from './dto/upsert-product-translation.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly imagesRepository: Repository<ProductImage>,

    @InjectRepository(ProductTranslation)
    private readonly productTranslationsRepository: Repository<ProductTranslation>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,

    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
  ) {}

  private buildOrderReference(orderId: number) {
    return `ALT-${String(orderId).padStart(4, '0')}`;
  }

  private sanitizeUser(user: User) {
    const {
      password,
      resetPasswordToken,
      resetPasswordExpiresAt,
      emailVerificationToken,
      emailVerificationExpiresAt,
      pendingEmail,
      emailChangeToken,
      emailChangeExpiresAt,
      adminTwoFactorCode,
      adminTwoFactorExpiresAt,
      adminTwoFactorRememberMe,
      ...safeUser
    } = user;

    return safeUser;
  }

  private normalizeUploadUrl(url?: string | null) {
    if (!url) return '';

    if (url.startsWith('/uploads/')) return url;

    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.pathname.startsWith('/uploads/')) {
        return parsedUrl.pathname;
      }
    } catch {
      // URL relative ou texte normal
    }

    return url;
  }

  private getStatsPeriod(period?: string) {
    const normalizedPeriod = period === '5w' ? '5w' : '7d';
    const now = new Date();

    if (normalizedPeriod === '5w') {
      const startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - 28);

      return {
        startDate,
        groupFormat: '%x-%v',
        labelFormat: "CONCAT('S', DATE_FORMAT(order.createdAt, '%v'))",
      };
    }

    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 6);

    return {
      startDate,
      groupFormat: '%Y-%m-%d',
      labelFormat: "DATE_FORMAT(order.createdAt, '%d/%m')",
    };
  }

  private async mapProduct(product: Product) {
    const category = product.categoryId
      ? await this.categoriesRepository.findOne({
          where: { id: product.categoryId },
        })
      : null;

    const images = await this.imagesRepository.find({
      where: { productId: product.id },
      order: { displayOrder: 'ASC', id: 'ASC' },
    });

    const translations = await this.productTranslationsRepository.find({
      where: { productId: product.id },
      order: { language: 'ASC' },
    });

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      techSpecs: product.techSpecs,
      priceCents: product.priceCents,
      stock: product.stock,
      priority: product.priority,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      categoryId: product.categoryId,
      category: category
        ? {
            id: category.id,
            name: category.name,
            slug: category.slug,
          }
        : null,
      imageUrl: this.normalizeUploadUrl(images[0]?.url || ''),
      images: images.map((image) => ({
        id: image.id,
        url: this.normalizeUploadUrl(image.url),
        imageUrl: this.normalizeUploadUrl(image.url),
        alt: image.altText || product.name,
        altText: image.altText || product.name,
        displayOrder: image.displayOrder,
      })),
      translations,
    };
  }

  private mapShippingAddress(address: Address | null) {
    if (!address) return null;

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

  private async mapAdminOrder(order: Order) {
    const user = await this.usersRepository.findOne({
      where: { id: order.userId },
    });

    const shippingAddress = order.shippingAddressId
      ? await this.addressesRepository.findOne({
          where: { id: order.shippingAddressId },
        })
      : null;

    const items = await this.orderItemsRepository.find({
      where: { orderId: order.id },
    });

    const mappedItems: {
      id: number;
      productId: number;
      name: string;
      quantity: number;
      priceCents: number;
      totalCents: number;
      imageUrl: string;
    }[] = [];

    for (const item of items) {
      const product = await this.productsRepository.findOne({
        where: { id: item.productId },
      });

      const images = product
        ? await this.imagesRepository.find({
            where: { productId: product.id },
            order: { displayOrder: 'ASC', id: 'ASC' },
          })
        : [];

      mappedItems.push({
        id: item.id,
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        priceCents: item.unitPriceCents,
        totalCents: item.totalCents,
        imageUrl: this.normalizeUploadUrl(images[0]?.url || ''),
      });
    }

    return {
      id: order.id,
      reference: this.buildOrderReference(order.id),
      status: order.status,
      createdAt: order.createdAt,
      totalPriceCents: order.totalCents,
      totalCents: order.totalCents,
      paymentMethod: order.paymentMethod,
      user: user
        ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
          }
        : null,
      shippingAddress: this.mapShippingAddress(shippingAddress),
      items: mappedItems,
    };
  }

  async getStats(period?: string) {
    const statsPeriod = this.getStatsPeriod(period);

    const productsCount = await this.productsRepository.count();
    const usersCount = await this.usersRepository.count();
    const ordersCount = await this.ordersRepository.count();

    const revenue = await this.ordersRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalCents)', 'total')
      .getRawOne();

    const salesByDayRaw = await this.ordersRepository
      .createQueryBuilder('order')
      .select(
        `DATE_FORMAT(order.createdAt, '${statsPeriod.groupFormat}')`,
        'periodKey',
      )
      .addSelect(statsPeriod.labelFormat, 'label')
      .addSelect('SUM(order.totalCents)', 'totalCents')
      .where('order.createdAt >= :startDate', {
        startDate: statsPeriod.startDate,
      })
      .groupBy('periodKey')
      .addGroupBy('label')
      .orderBy('MIN(order.createdAt)', 'ASC')
      .getRawMany();

    const salesByCategoryRaw = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoin(OrderItem, 'item', 'item.orderId = order.id')
      .leftJoin(Product, 'product', 'product.id = item.productId')
      .leftJoin(Category, 'category', 'category.id = product.categoryId')
      .select('category.name', 'label')
      .addSelect('SUM(item.totalCents)', 'totalCents')
      .addSelect('COUNT(DISTINCT order.id)', 'ordersCount')
      .where('order.createdAt >= :startDate', {
        startDate: statsPeriod.startDate,
      })
      .groupBy('category.name')
      .getRawMany();

    return {
      productsCount,
      usersCount,
      ordersCount,
      revenueCents: Number(revenue?.total || 0),
      salesByDay: salesByDayRaw.map((row) => ({
        label: row.label,
        totalCents: Number(row.totalCents || 0),
      })),
      salesByCategory: salesByCategoryRaw.map((row) => ({
        label: row.label || 'Sans catégorie',
        totalCents: Number(row.totalCents || 0),
        ordersCount: Number(row.ordersCount || 0),
      })),
    };
  }

  async findAllProducts() {
    const products = await this.productsRepository.find({
      order: { createdAt: 'DESC' },
    });

    return Promise.all(products.map((product) => this.mapProduct(product)));
  }

  async findProductById(id: number) {
    const product = await this.productsRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    return this.mapProduct(product);
  }

  async findProductTranslations(productId: number) {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    return this.productTranslationsRepository.find({
      where: { productId },
      order: { language: 'ASC' },
    });
  }

  async upsertProductTranslation(
    productId: number,
    dto: UpsertProductTranslationDto,
  ) {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    let translation = await this.productTranslationsRepository.findOne({
      where: {
        productId,
        language: dto.language,
      },
    });

    if (!translation) {
      translation = this.productTranslationsRepository.create({
        productId,
        language: dto.language,
      });
    }

    translation.name = dto.name;
    translation.shortDescription = dto.shortDescription;
    translation.description = dto.description;
    translation.techSpecs = dto.techSpecs;

    return this.productTranslationsRepository.save(translation);
  }

  async deleteProductTranslation(productId: number, language: string) {
    const translation = await this.productTranslationsRepository.findOne({
      where: {
        productId,
        language: language as any,
      },
    });

    if (!translation) {
      throw new NotFoundException('PRODUCT_TRANSLATION_NOT_FOUND');
    }

    await this.productTranslationsRepository.remove(translation);

    return {
      message: 'PRODUCT_TRANSLATION_DELETED_SUCCESS',
    };
  }

  async createProduct(dto: CreateAdminProductDto) {
    const product = this.productsRepository.create({
      sku: dto.sku,
      name: dto.name,
      slug: dto.slug,
      shortDescription: dto.shortDescription,
      description: dto.description,
      techSpecs: dto.techSpecs,
      priceCents: dto.priceCents,
      stock: dto.stock,
      priority: dto.priority || 0,
      isActive: dto.isActive ?? true,
      isFeatured: dto.isFeatured ?? false,
      categoryId: dto.categoryId,
    });

    const savedProduct = await this.productsRepository.save(product);

    if (dto.imageUrl) {
      await this.imagesRepository.save({
        productId: savedProduct.id,
        url: this.normalizeUploadUrl(dto.imageUrl),
        altText: savedProduct.name,
        displayOrder: 0,
      });
    }

    if (dto.images?.length) {
      for (const image of dto.images) {
        await this.imagesRepository.save({
          productId: savedProduct.id,
          url: this.normalizeUploadUrl(image.url),
          altText: image.alt || savedProduct.name,
          displayOrder: image.displayOrder || 1,
        });
      }
    }

    return this.findProductById(savedProduct.id);
  }

  async updateProduct(id: number, dto: UpdateAdminProductDto) {
    const product = await this.productsRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    Object.assign(product, {
      sku: dto.sku ?? product.sku,
      name: dto.name ?? product.name,
      slug: dto.slug ?? product.slug,
      shortDescription: dto.shortDescription ?? product.shortDescription,
      description: dto.description ?? product.description,
      techSpecs: dto.techSpecs ?? product.techSpecs,
      priceCents: dto.priceCents ?? product.priceCents,
      stock: dto.stock ?? product.stock,
      priority: dto.priority ?? product.priority,
      isActive: dto.isActive ?? product.isActive,
      isFeatured: dto.isFeatured ?? product.isFeatured,
      categoryId: dto.categoryId ?? product.categoryId,
    });

    await this.productsRepository.save(product);

    if (dto.imageUrl) {
      const cleanImageUrl = this.normalizeUploadUrl(dto.imageUrl);

      const existingMainImage = await this.imagesRepository.findOne({
        where: {
          productId: product.id,
          displayOrder: 0,
        },
      });

      if (existingMainImage) {
        existingMainImage.url = cleanImageUrl;
        existingMainImage.altText = product.name;
        existingMainImage.displayOrder = 0;

        await this.imagesRepository.save(existingMainImage);
      } else {
        await this.imagesRepository.save({
          productId: product.id,
          url: cleanImageUrl,
          altText: product.name,
          displayOrder: 0,
        });
      }
    }

    return this.findProductById(product.id);
  }

  async uploadProductImage(productId: number, imageUrl: string) {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    const cleanImageUrl = this.normalizeUploadUrl(imageUrl);

    const existingMainImage = await this.imagesRepository.findOne({
      where: {
        productId,
        displayOrder: 0,
      },
    });

    if (existingMainImage) {
      existingMainImage.url = cleanImageUrl;
      existingMainImage.altText = product.name;
      existingMainImage.displayOrder = 0;

      await this.imagesRepository.save(existingMainImage);
    } else {
      await this.imagesRepository.save({
        productId,
        url: cleanImageUrl,
        altText: product.name,
        displayOrder: 0,
      });
    }

    return this.findProductById(productId);
  }

  async uploadProductGalleryImage(productId: number, imageUrl: string) {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    const images = await this.imagesRepository.find({
      where: { productId },
      order: { displayOrder: 'DESC', id: 'DESC' },
    });

    const maxDisplayOrder = images.length
      ? Math.max(...images.map((image) => image.displayOrder || 0))
      : 0;

    const image = await this.imagesRepository.save({
      productId,
      url: this.normalizeUploadUrl(imageUrl),
      altText: product.name,
      displayOrder: Math.max(maxDisplayOrder + 1, 1),
    });

    return {
      id: image.id,
      url: this.normalizeUploadUrl(image.url),
      imageUrl: this.normalizeUploadUrl(image.url),
      alt: image.altText || product.name,
      altText: image.altText || product.name,
      displayOrder: image.displayOrder,
    };
  }

  async getProductImages(productId: number) {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    const images = await this.imagesRepository
      .createQueryBuilder('image')
      .where('image.productId = :productId', { productId })
      .andWhere('image.displayOrder > 0')
      .orderBy('image.displayOrder', 'ASC')
      .addOrderBy('image.id', 'ASC')
      .getMany();

    return images.map((image) => ({
      id: image.id,
      url: this.normalizeUploadUrl(image.url),
      imageUrl: this.normalizeUploadUrl(image.url),
      alt: image.altText || product.name,
      altText: image.altText || product.name,
      displayOrder: image.displayOrder,
    }));
  }

  async updateProductImage(
    productId: number,
    imageId: number,
    dto: {
      url?: string;
      alt?: string;
      altText?: string;
      displayOrder?: number;
    },
  ) {
    const image = await this.imagesRepository.findOne({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException('PRODUCT_IMAGE_NOT_FOUND');
    }

    if (dto.url !== undefined) {
      image.url = this.normalizeUploadUrl(dto.url);
    }

    if (dto.alt !== undefined || dto.altText !== undefined) {
      image.altText = dto.alt ?? dto.altText;
    }

    if (dto.displayOrder !== undefined) {
      image.displayOrder = Math.max(Number(dto.displayOrder), 1);
    }

    await this.imagesRepository.save(image);

    return this.findProductById(productId);
  }

  async deleteProductImage(productId: number, imageId: number) {
    const image = await this.imagesRepository.findOne({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException('PRODUCT_IMAGE_NOT_FOUND');
    }

    await this.imagesRepository.delete(image.id);

    return this.findProductById(productId);
  }

  async deleteProduct(id: number) {
    const product = await this.productsRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    await this.productsRepository.delete(id);

    return {
      message: 'PRODUCT_DELETED_SUCCESS',
    };
  }

  async findCategories() {
    return this.categoriesRepository.find({
      order: { displayOrder: 'ASC' },
    });
  }

  async createCategory(dto: CreateAdminCategoryDto) {
    const category = this.categoriesRepository.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      imageUrl: this.normalizeUploadUrl(dto.imageUrl),
      displayOrder: dto.displayOrder || 0,
      isActive: dto.isActive ?? true,
    });

    return this.categoriesRepository.save(category);
  }

  async updateCategory(id: number, dto: UpdateAdminCategoryDto) {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }

    Object.assign(category, {
      name: dto.name ?? category.name,
      slug: dto.slug ?? category.slug,
      description: dto.description ?? category.description,
      imageUrl:
        dto.imageUrl !== undefined
          ? this.normalizeUploadUrl(dto.imageUrl)
          : category.imageUrl,
      displayOrder: dto.displayOrder ?? category.displayOrder,
      isActive: dto.isActive ?? category.isActive,
    });

    return this.categoriesRepository.save(category);
  }

  async uploadCategoryImage(categoryId: number, imageUrl: string) {
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }

    category.imageUrl = this.normalizeUploadUrl(imageUrl);

    return this.categoriesRepository.save(category);
  }

  async deleteCategory(id: number) {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }

    await this.categoriesRepository.delete(id);

    return {
      message: 'CATEGORY_DELETED_SUCCESS',
    };
  }

  async findAllOrdersAdmin() {
    const orders = await this.ordersRepository.find({
      order: { createdAt: 'DESC' },
    });

    return Promise.all(orders.map((order) => this.mapAdminOrder(order)));
  }

  async findOrderByIdAdmin(id: number) {
    const order = await this.ordersRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('ORDER_NOT_FOUND');
    }

    return this.mapAdminOrder(order);
  }

  async updateOrderStatusAdmin(id: number, dto: UpdateAdminOrderStatusDto) {
    const order = await this.ordersRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('ORDER_NOT_FOUND');
    }

    order.status = dto.status as any;

    await this.ordersRepository.save(order);

    return this.mapAdminOrder(order);
  }

  async findAllUsersAdmin() {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  async findUserByIdAdmin(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    return this.sanitizeUser(user);
  }

  async updateUserAdmin(id: number, dto: UpdateAdminUserDto) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: dto.email },
      });

      if (existingUser && existingUser.id !== user.id) {
        throw new ConflictException('EMAIL_ALREADY_USED');
      }

      user.email = dto.email;
      user.isEmailConfirmed = false;
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.role !== undefined) user.role = dto.role as any;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    user.fullName = `${user.firstName} ${user.lastName}`.trim();

    const updatedUser = await this.usersRepository.save(user);

    return this.sanitizeUser(updatedUser);
  }

  async deleteUserAdmin(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    if (user.role === 'admin') {
      const adminCount = await this.usersRepository.count({
        where: {
          role: user.role,
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('LAST_ADMIN_DELETE_FORBIDDEN');
      }
    }

    user.firstName = 'Utilisateur';
    user.lastName = 'Supprimé';
    user.fullName = 'Utilisateur supprimé';
    user.phone = undefined;
    user.email = `deleted_${user.id}_${Date.now()}@deleted.local`;
    user.password = await bcrypt.hash(
      `deleted_${Date.now()}_${Math.random()}`,
      10,
    );
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.isEmailConfirmed = false;
    user.isActive = false;

    await this.usersRepository.save(user);

    return {
      message: 'USER_DELETED_SUCCESS',
    };
  }
}