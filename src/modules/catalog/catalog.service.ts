import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { Category } from './entities/category.entity';
import { CategoryTranslation } from './entities/category-translation.entity';
import { Product } from './entities/product.entity';
import { ProductTranslation } from './entities/product-translation.entity';
import { HomeService } from '../home/home.service';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,

    @InjectRepository(CategoryTranslation)
    private readonly categoryTranslationsRepository: Repository<CategoryTranslation>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(ProductTranslation)
    private readonly productTranslationsRepository: Repository<ProductTranslation>,

    private readonly homeService: HomeService,
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

  private async mapCategory(category: Category) {
    const translations =
      category.translations ||
      (await this.categoryTranslationsRepository.find({
        where: { categoryId: category.id },
        order: { language: 'ASC' },
      }));

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      translations,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private async mapProduct(product: Product) {
    const images =
      product.images?.map((image) => ({
        id: image.id,
        url: image.url,
        imageUrl: image.url,
        alt: image.altText || product.name,
        altText: image.altText || product.name,
        displayOrder: image.displayOrder,
      })) || [];

    const translations =
      product.translations ||
      (await this.productTranslationsRepository.find({
        where: { productId: product.id },
        order: { language: 'ASC' },
      }));

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      techSpecs: this.formatTechSpecs(product.techSpecs),
      rawTechSpecs: product.techSpecs,
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
      translations,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private levenshteinDistance(a: string, b: string): number {
    const first = a.toLowerCase();
    const second = b.toLowerCase();

    const matrix = Array.from({ length: first.length + 1 }, () =>
      Array(second.length + 1).fill(0),
    );

    for (let i = 0; i <= first.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= second.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= first.length; i += 1) {
      for (let j = 1; j <= second.length; j += 1) {
        const cost = first[i - 1] === second[j - 1] ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }

    return matrix[first.length][second.length];
  }

  private productMatchesOneCharDiff(product: Product, search: string): boolean {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return true;

    const fields = [
      product.name,
      product.shortDescription,
      product.description,
      product.sku,
      this.formatTechSpecs(product.techSpecs),
      ...(product.translations || []).flatMap((translation) => [
        translation.name,
        translation.shortDescription,
        translation.description,
      ]),
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    return fields.some((field) => {
      const words = field
        .split(/[\s,.;:/|()"'’!?-]+/)
        .map((word) => word.trim())
        .filter(Boolean);

      return words.some(
        (word) => this.levenshteinDistance(word, normalizedSearch) <= 1,
      );
    });
  }

  async getHome() {
    const slides = await this.homeService.getPublicSlides();
    const homeContent = await this.homeService.getHomeContent();

    const categories = await this.categoriesRepository.find({
      where: { isActive: true },
      relations: { translations: true },
      order: { displayOrder: 'ASC' },
    });

    const featured = await this.productsRepository.find({
      where: {
        isActive: true,
        isFeatured: true,
      },
      relations: {
        category: true,
        images: true,
        translations: true,
      },
      order: {
        priority: 'DESC',
      },
    });

    return {
      slides,
      homeText: homeContent.homeText,
      categories: await Promise.all(
        categories.map((category) => this.mapCategory(category)),
      ),
      featured: await Promise.all(
        featured.map((product) => this.mapProduct(product)),
      ),
    };
  }

  async getCategories() {
    const categories = await this.categoriesRepository.find({
      where: { isActive: true },
      relations: { translations: true },
      order: {
        displayOrder: 'ASC',
        name: 'ASC',
      },
    });

    return Promise.all(categories.map((category) => this.mapCategory(category)));
  }

  async getCategoryBySlug(slug: string) {
    const category = await this.categoriesRepository.findOne({
      where: { slug, isActive: true },
      relations: { translations: true },
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }

    return this.mapCategory(category);
  }

  async getProducts(query: any) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(query.limit || query.pageSize) || 12, 1),
      50,
    );
    const skip = (page - 1) * limit;

    const rawSearch = String(query.search || query.q || '').trim();
    const matchMode = String(query.matchMode || 'auto');

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.translations', 'translations')
      .where('product.isActive = :isActive', { isActive: true });

    if (rawSearch && matchMode !== 'one_char_diff') {
      const containsSearch = `%${rawSearch}%`;
      const startsWithSearch = `${rawSearch}%`;
      const exactSearch = rawSearch;

      if (matchMode === 'auto') {
        qb.andWhere(
          new Brackets((where) => {
            where
              .where('product.name LIKE :containsSearch', { containsSearch })
              .orWhere('product.description LIKE :containsSearch', {
                containsSearch,
              })
              .orWhere('product.shortDescription LIKE :containsSearch', {
                containsSearch,
              })
              .orWhere('product.sku LIKE :containsSearch', { containsSearch })
              .orWhere('JSON_EXTRACT(product.techSpecs, "$") LIKE :containsSearch', {
                containsSearch,
              })
              .orWhere('translations.name LIKE :containsSearch', {
                containsSearch,
              })
              .orWhere('translations.description LIKE :containsSearch', {
                containsSearch,
              })
              .orWhere('translations.shortDescription LIKE :containsSearch', {
                containsSearch,
              });
          }),
        );

        qb.addSelect(
          `
          CASE
            WHEN LOWER(product.name) = LOWER(:exactSearch)
              OR LOWER(product.description) = LOWER(:exactSearch)
              OR LOWER(product.shortDescription) = LOWER(:exactSearch)
              OR LOWER(product.sku) = LOWER(:exactSearch)
              OR LOWER(translations.name) = LOWER(:exactSearch)
              THEN 1

            WHEN LOWER(product.name) LIKE LOWER(:startsWithSearch)
              OR LOWER(product.description) LIKE LOWER(:startsWithSearch)
              OR LOWER(product.shortDescription) LIKE LOWER(:startsWithSearch)
              OR LOWER(product.sku) LIKE LOWER(:startsWithSearch)
              OR LOWER(translations.name) LIKE LOWER(:startsWithSearch)
              THEN 3

            WHEN LOWER(product.name) LIKE LOWER(:containsSearch)
              OR LOWER(product.description) LIKE LOWER(:containsSearch)
              OR LOWER(product.shortDescription) LIKE LOWER(:containsSearch)
              OR LOWER(product.sku) LIKE LOWER(:containsSearch)
              OR LOWER(JSON_EXTRACT(product.techSpecs, "$")) LIKE LOWER(:containsSearch)
              OR LOWER(translations.name) LIKE LOWER(:containsSearch)
              OR LOWER(translations.description) LIKE LOWER(:containsSearch)
              OR LOWER(translations.shortDescription) LIKE LOWER(:containsSearch)
              THEN 4

            ELSE 5
          END
          `,
          'searchRank',
        );

        qb.setParameters({
          exactSearch,
          startsWithSearch,
          containsSearch,
        });
      }

      if (matchMode === 'exact') {
        qb.andWhere(
          new Brackets((where) => {
            where
              .where('LOWER(product.name) = LOWER(:exactSearch)', {
                exactSearch,
              })
              .orWhere('LOWER(product.description) = LOWER(:exactSearch)', {
                exactSearch,
              })
              .orWhere('LOWER(product.shortDescription) = LOWER(:exactSearch)', {
                exactSearch,
              })
              .orWhere('LOWER(product.sku) = LOWER(:exactSearch)', {
                exactSearch,
              })
              .orWhere('LOWER(translations.name) = LOWER(:exactSearch)', {
                exactSearch,
              })
              .orWhere('LOWER(translations.description) = LOWER(:exactSearch)', {
                exactSearch,
              })
              .orWhere(
                'LOWER(JSON_EXTRACT(product.techSpecs, "$")) = LOWER(:exactSearch)',
                { exactSearch },
              );
          }),
        );
      }

      if (matchMode === 'starts_with') {
        qb.andWhere(
          new Brackets((where) => {
            where
              .where('product.name LIKE :startsWithSearch', {
                startsWithSearch,
              })
              .orWhere('product.description LIKE :startsWithSearch', {
                startsWithSearch,
              })
              .orWhere('product.shortDescription LIKE :startsWithSearch', {
                startsWithSearch,
              })
              .orWhere('product.sku LIKE :startsWithSearch', {
                startsWithSearch,
              })
              .orWhere('translations.name LIKE :startsWithSearch', {
                startsWithSearch,
              })
              .orWhere('translations.description LIKE :startsWithSearch', {
                startsWithSearch,
              })
              .orWhere(
                'JSON_EXTRACT(product.techSpecs, "$") LIKE :startsWithSearch',
                { startsWithSearch },
              );
          }),
        );
      }

      if (matchMode === 'contains') {
        qb.andWhere(
          new Brackets((where) => {
            where
              .where('product.name LIKE :containsSearch', { containsSearch })
              .orWhere('product.description LIKE :containsSearch', {
                containsSearch,
              })
              .orWhere('product.shortDescription LIKE :containsSearch', {
                containsSearch,
              })
              .orWhere('product.sku LIKE :containsSearch', { containsSearch })
              .orWhere('translations.name LIKE :containsSearch', {
                containsSearch,
              })
              .orWhere('translations.description LIKE :containsSearch', {
                containsSearch,
              })
              .orWhere('translations.shortDescription LIKE :containsSearch', {
                containsSearch,
              })
              .orWhere('JSON_EXTRACT(product.techSpecs, "$") LIKE :containsSearch', {
                containsSearch,
              });
          }),
        );
      }
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

    if (rawSearch && matchMode === 'one_char_diff') {
      const allMatchingProducts = await qb.getMany();

      const filteredProducts = allMatchingProducts.filter((product) =>
        this.productMatchesOneCharDiff(product, rawSearch),
      );

      const sortedProducts = this.sortProductsInMemory(
        filteredProducts,
        query.sort || query.sortBy || 'priority',
      );

      const paginatedProducts = sortedProducts.slice(skip, skip + limit);
      const total = sortedProducts.length;

      return {
        items: await Promise.all(
          paginatedProducts.map((product) => this.mapProduct(product)),
        ),
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

    if (rawSearch && matchMode === 'auto') {
      qb.orderBy('searchRank', 'ASC');
      qb.addOrderBy('product.priority', 'DESC');
      qb.addOrderBy('product.stock', 'DESC');
      qb.addOrderBy('product.createdAt', 'DESC');
    } else {
      this.applySort(qb, query.sort || query.sortBy);
    }

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: await Promise.all(items.map((product) => this.mapProduct(product))),
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

  private applySort(qb: any, sort?: string) {
    switch (sort) {
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
  }

  private sortProductsInMemory(products: Product[], sort?: string): Product[] {
    const sortedProducts = [...products];

    switch (sort) {
      case 'price_asc':
        return sortedProducts.sort((a, b) => a.priceCents - b.priceCents);

      case 'price_desc':
        return sortedProducts.sort((a, b) => b.priceCents - a.priceCents);

      case 'name_asc':
        return sortedProducts.sort((a, b) => a.name.localeCompare(b.name));

      case 'name_desc':
        return sortedProducts.sort((a, b) => b.name.localeCompare(a.name));

      case 'newest':
        return sortedProducts.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );

      case 'oldest':
        return sortedProducts.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );

      case 'stock_desc':
        return sortedProducts.sort((a, b) => b.stock - a.stock);

      case 'stock_asc':
        return sortedProducts.sort((a, b) => a.stock - b.stock);

      case 'priority':
      default:
        return sortedProducts.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          if (b.stock !== a.stock) return b.stock - a.stock;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }
  }

  async getProductBySlug(slug: string) {
    const product = await this.productsRepository.findOne({
      where: { slug, isActive: true },
      relations: {
        category: true,
        images: true,
        translations: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return this.mapProduct(product);
  }
}