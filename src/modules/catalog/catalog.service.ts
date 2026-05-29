import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  private formatTechSpecs(techSpecs: unknown): string {
    if (!techSpecs) return '';

    if (typeof techSpecs === 'string') return techSpecs;

    if (typeof techSpecs === 'object') {
      return Object.entries(techSpecs as Record<string, unknown>)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' | ');
    }

    return String(techSpecs);
  }

  private mapProduct(product: Product) {
    const images =
      product.images?.map((image) => ({
        id: image.id,
        url: image.url,
        imageUrl: image.url,
        alt: image.altText || product.name,
        altText: image.altText || product.name,
        displayOrder: image.displayOrder,
      })) || [];

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      techSpecs: this.formatTechSpecs(product.techSpecs),
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
      imageUrl: images[0]?.url || '',
      images,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async getHome() {
    const categories = await this.categoriesRepository.find({
      where: { isActive: true },
      order: {
        displayOrder: 'ASC',
        name: 'ASC',
      },
      take: 8,
    });

    const featuredProducts = await this.productsRepository.find({
      where: {
        isActive: true,
        isFeatured: true,
      },
      order: {
        priority: 'DESC',
        createdAt: 'DESC',
      },
      take: 8,
    });

    return {
      slides: [
        {
          id: 1,
          title: 'Althea Systems',
          subtitle: 'Matériel médical professionnel',
          imageUrl: '',
          ctaLabel: 'Voir le catalogue',
          ctaUrl: '/catalogue',
          displayOrder: 1,
          isActive: true,
        },
      ],
      homeText:
        'Découvrez notre sélection de matériel médical professionnel pour cabinets et structures de santé.',
      categories,
      featured: featuredProducts.map((product) => this.mapProduct(product)),
    };
  }

  async getCategories() {
    return this.categoriesRepository.find({
      where: { isActive: true },
      order: {
        displayOrder: 'ASC',
        name: 'ASC',
      },
    });
  }

  async getCategoryBySlug(slug: string) {
    const category = await this.categoriesRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }

    return category;
  }

  async getProducts(query: any) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(query.limit || query.pageSize) || 12, 1),
      50,
    );
    const skip = (page - 1) * limit;

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.isActive = :isActive', { isActive: true });

    if (query.search || query.q) {
      const rawSearch = String(query.search || query.q).trim();
      const matchMode = String(query.matchMode || 'contains');

      let searchValue = `%${rawSearch}%`;

      if (matchMode === 'exact') {
        searchValue = rawSearch;
      }

      if (matchMode === 'starts_with') {
        searchValue = `${rawSearch}%`;
      }

      qb.andWhere(
        new Brackets((where) => {
          where
            .where('product.name LIKE :search', { search: searchValue })
            .orWhere('product.description LIKE :search', {
              search: searchValue,
            })
            .orWhere('product.shortDescription LIKE :search', {
              search: searchValue,
            })
            .orWhere('product.sku LIKE :search', {
              search: searchValue,
            })
            .orWhere('JSON_EXTRACT(product.techSpecs, "$") LIKE :search', {
              search: searchValue,
            });
        }),
      );
    }

    if (query.category || query.categorySlug) {
      qb.andWhere('category.slug = :categorySlug', {
        categorySlug: query.category || query.categorySlug,
      });
    }

    if (query.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: Number(query.categoryId),
      });
    }

    if (query.minPriceCents) {
      qb.andWhere('product.priceCents >= :minPriceCents', {
        minPriceCents: Number(query.minPriceCents),
      });
    }

    if (query.maxPriceCents) {
      qb.andWhere('product.priceCents <= :maxPriceCents', {
        maxPriceCents: Number(query.maxPriceCents),
      });
    }

    if (
      query.availableOnly === 'true' ||
      query.inStock === 'true' ||
      query.availability === 'in_stock'
    ) {
      qb.andWhere('product.stock > 0');
    }

    if (query.availability === 'out_of_stock') {
      qb.andWhere('product.stock <= 0');
    }

    switch (query.sort || query.sortBy) {
      case 'price_asc':
        qb.orderBy('product.priceCents', 'ASC');
        break;

      case 'price_desc':
        qb.orderBy('product.priceCents', 'DESC');
        break;

      case 'name_asc':
        qb.orderBy('product.name', 'ASC');
        break;

      case 'name_desc':
        qb.orderBy('product.name', 'DESC');
        break;

      case 'newest':
        qb.orderBy('product.createdAt', 'DESC');
        break;

      case 'oldest':
        qb.orderBy('product.createdAt', 'ASC');
        break;

      case 'stock_desc':
        qb.orderBy('product.stock', 'DESC');
        break;

      case 'stock_asc':
        qb.orderBy('product.stock', 'ASC');
        break;

      case 'priority':
      default:
        qb.orderBy('product.priority', 'DESC');
        qb.addOrderBy('product.stock', 'DESC');
        qb.addOrderBy('product.createdAt', 'DESC');
        break;
    }

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((product) => this.mapProduct(product)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      total,
      page,
      pageSize: limit,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductBySlug(slug: string) {
    const product = await this.productsRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return this.mapProduct(
      
      
      product);
  }
}