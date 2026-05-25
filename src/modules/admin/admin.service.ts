import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from '../catalog/entities/product.entity';
import { ProductImage } from '../catalog/entities/product-image.entity';
import { Category } from '../catalog/entities/category.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';

import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly imagesRepository: Repository<ProductImage>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,

    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  private mapProduct(product: Product) {
    const sortedImages = [...(product.images || [])].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );

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

      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,

      imageUrl: sortedImages[0]?.url || '',

      images: sortedImages.map((image) => ({
        id: image.id,
        url: image.url,
        alt: image.altText,
        displayOrder: image.displayOrder,
      })),
    };
  }

  private async upsertMainImage(
    productId: number,
    imageUrl?: string,
  ) {
    if (!imageUrl) {
      return;
    }

    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(
        'Produit introuvable',
      );
    }

    const existingImage =
      await this.imagesRepository.findOne({
        where: {
          productId,
          displayOrder: 0,
        },
      });

    if (existingImage) {
      existingImage.url = imageUrl;
      existingImage.altText = product.name;

      await this.imagesRepository.save(
        existingImage,
      );

      return;
    }

    const newImage =
      this.imagesRepository.create({
        productId,
        url: imageUrl,
        altText: product.name,
        displayOrder: 0,
      });

    await this.imagesRepository.save(newImage);
  }

  async getStats() {
    const productsCount =
      await this.productsRepository.count();

    const usersCount =
      await this.usersRepository.count();

    const ordersCount =
      await this.ordersRepository.count();

    const revenue =
      await this.ordersRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalCents)', 'total')
        .getRawOne();

    const salesByDayRaw =
      await this.ordersRepository
        .createQueryBuilder('order')
        .select(
          "DATE_FORMAT(order.createdAt, '%a')",
          'label',
        )
        .addSelect(
          'SUM(order.totalCents)',
          'totalCents',
        )
        .groupBy(
          "DATE_FORMAT(order.createdAt, '%a')",
        )
        .orderBy(
          'MIN(order.createdAt)',
          'ASC',
        )
        .getRawMany();

    const salesByCategoryRaw =
      await this.ordersRepository
        .createQueryBuilder('order')
        .leftJoin('order.items', 'item')
        .leftJoin('item.product', 'product')
        .leftJoin(
          'product.category',
          'category',
        )
        .select('category.name', 'label')
        .addSelect(
          'SUM(item.totalCents)',
          'totalCents',
        )
        .groupBy('category.name')
        .getRawMany();

    return {
      productsCount,
      usersCount,
      ordersCount,

      revenueCents: Number(
        revenue?.total || 0,
      ),

      salesByDay: salesByDayRaw.map(
        (row) => ({
          label: row.label,
          totalCents: Number(
            row.totalCents || 0,
          ),
        }),
      ),

      salesByCategory:
        salesByCategoryRaw.map((row) => ({
          label:
            row.label ||
            'Sans catégorie',

          totalCents: Number(
            row.totalCents || 0,
          ),
        })),
    };
  }

  async findAllProducts() {
    const products =
      await this.productsRepository.find({
        order: {
          createdAt: 'DESC',
        },
      });

    return products.map((product) =>
      this.mapProduct(product),
    );
  }

  async findProductById(id: number) {
    const product =
      await this.productsRepository.findOne({
        where: { id },
      });

    if (!product) {
      throw new NotFoundException(
        'Produit introuvable',
      );
    }

    return this.mapProduct(product);
  }

  async createProduct(
    dto: CreateAdminProductDto,
  ) {
    const product =
      this.productsRepository.create({
        sku: dto.sku,
        name: dto.name,
        slug: dto.slug,
        shortDescription:
          dto.shortDescription,

        description: dto.description,

        techSpecs: dto.techSpecs,

        priceCents: dto.priceCents,
        stock: dto.stock,

        priority: dto.priority || 0,

        isActive:
          dto.isActive ?? true,

        isFeatured:
          dto.isFeatured ?? false,

        categoryId: dto.categoryId,
      });

    const savedProduct =
      await this.productsRepository.save(
        product,
      );

    await this.upsertMainImage(
      savedProduct.id,
      dto.imageUrl,
    );

    if (dto.images?.length) {
      for (const image of dto.images) {
        if (!image.url) {
          continue;
        }

        const productImage =
          this.imagesRepository.create({
            productId: savedProduct.id,
            url: image.url,

            altText:
              image.alt ||
              savedProduct.name,

            displayOrder:
              image.displayOrder ?? 1,
          });

        await this.imagesRepository.save(
          productImage,
        );
      }
    }

    return this.findProductById(
      savedProduct.id,
    );
  }

  async updateProduct(
    id: number,
    dto: UpdateAdminProductDto,
  ) {
    const product =
      await this.productsRepository.findOne({
        where: { id },
      });

    if (!product) {
      throw new NotFoundException(
        'Produit introuvable',
      );
    }

    Object.assign(product, {
      sku: dto.sku ?? product.sku,

      name: dto.name ?? product.name,

      slug: dto.slug ?? product.slug,

      shortDescription:
        dto.shortDescription ??
        product.shortDescription,

      description:
        dto.description ??
        product.description,

      techSpecs:
        dto.techSpecs ??
        product.techSpecs,

      priceCents:
        dto.priceCents ??
        product.priceCents,

      stock:
        dto.stock ?? product.stock,

      priority:
        dto.priority ??
        product.priority,

      isActive:
        dto.isActive ??
        product.isActive,

      isFeatured:
        dto.isFeatured ??
        product.isFeatured,

      categoryId:
        dto.categoryId ??
        product.categoryId,
    });

    await this.productsRepository.save(
      product,
    );

    await this.upsertMainImage(
      product.id,
      dto.imageUrl,
    );

    return this.findProductById(
      product.id,
    );
  }

  async uploadProductImage(
    productId: number,
    imageUrl: string,
  ) {
    const product =
      await this.productsRepository.findOne({
        where: { id: productId },
      });

    if (!product) {
      throw new NotFoundException(
        'Produit introuvable',
      );
    }

    const currentImagesCount =
      await this.imagesRepository.count({
        where: { productId },
      });

    const image =
      this.imagesRepository.create({
        productId,
        url: imageUrl,
        altText: product.name,
        displayOrder:
          currentImagesCount,
      });

    await this.imagesRepository.save(
      image,
    );

    return this.findProductById(
      productId,
    );
  }

  async deleteProduct(id: number) {
    const product =
      await this.productsRepository.findOne({
        where: { id },
      });

    if (!product) {
      throw new NotFoundException(
        'Produit introuvable',
      );
    }

    await this.productsRepository.delete(id);

    return {
      message:
        'Produit supprimé avec succès',
    };
  }

  async findCategories() {
    return this.categoriesRepository.find({
      order: {
        displayOrder: 'ASC',
      },
    });
  }
}