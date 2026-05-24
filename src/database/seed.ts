import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from '../app.module';

import { Category } from '../modules/catalog/entities/category.entity';
import { Product } from '../modules/catalog/entities/product.entity';
import { ProductImage } from '../modules/catalog/entities/product-image.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const dataSource = app.get(DataSource);

  const categoriesRepository = dataSource.getRepository(Category);
  const productsRepository = dataSource.getRepository(Product);
  const imagesRepository = dataSource.getRepository(ProductImage);

  console.log('Suppression anciennes données...');

  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

  await dataSource.query('TRUNCATE TABLE cart_items');
  await dataSource.query('TRUNCATE TABLE order_items');
  await dataSource.query('TRUNCATE TABLE orders');
  await dataSource.query('TRUNCATE TABLE product_images');
  await dataSource.query('TRUNCATE TABLE products');
  await dataSource.query('TRUNCATE TABLE categories');

  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('Création catégories...');

  const categories = await categoriesRepository.save([
    {
      name: 'Imagerie médicale',
      slug: 'imagerie-medicale',
      description: 'Matériel d’imagerie médicale',
      imageUrl:
        'https://images.unsplash.com/photo-1581595219315-a187dd40c322',
      displayOrder: 1,
      isActive: true,
    },
    {
      name: 'Diagnostic',
      slug: 'diagnostic',
      description: 'Matériel de diagnostic',
      imageUrl:
        'https://images.unsplash.com/photo-1579684385127-1ef15d508118',
      displayOrder: 2,
      isActive: true,
    },
    {
      name: 'Bloc opératoire',
      slug: 'bloc-operatoire',
      description: 'Équipements de chirurgie',
      imageUrl:
        'https://images.unsplash.com/photo-1516549655169-df83a0774514',
      displayOrder: 3,
      isActive: true,
    },
  ]);

  console.log('Création produits...');

  const scanner = await productsRepository.save({
    sku: 'ALT-SCAN-001',
    name: 'Scanner médical HD',
    slug: 'scanner-medical-hd',
    shortDescription: 'Scanner médical haute précision',
    description:
      'Scanner médical professionnel haute précision pour centres hospitaliers.',
    techSpecs: {
      resolution: '4K',
      precision: '0.1mm',
    },
    priceCents: 499999,
    stock: 12,
    priority: 10,
    isActive: true,
    isFeatured: true,
    categoryId: categories[0].id,
  });

  const ecg = await productsRepository.save({
    sku: 'ALT-ECG-002',
    name: 'ECG Professionnel',
    slug: 'ecg-professionnel',
    shortDescription: 'ECG 12 dérivations',
    description: 'Appareil ECG professionnel avec analyse automatique.',
    techSpecs: {
      screen: '10 pouces',
      derivations: 12,
    },
    priceCents: 149999,
    stock: 25,
    priority: 8,
    isActive: true,
    isFeatured: true,
    categoryId: categories[1].id,
  });

  const respirateur = await productsRepository.save({
    sku: 'ALT-RESP-003',
    name: 'Respirateur médical',
    slug: 'respirateur-medical',
    shortDescription: 'Respirateur haute performance',
    description: 'Respirateur médical destiné aux soins intensifs.',
    techSpecs: {
      autonomie: '12h',
      modes: ['assisté', 'contrôlé'],
    },
    priceCents: 899999,
    stock: 5,
    priority: 9,
    isActive: true,
    isFeatured: true,
    categoryId: categories[2].id,
  });

  console.log('Création images...');

  await imagesRepository.save([
    {
      productId: scanner.id,
      url: 'https://images.unsplash.com/photo-1581595219315-a187dd40c322',
      altText: scanner.name,
      displayOrder: 1,
    },
    {
      productId: ecg.id,
      url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118',
      altText: ecg.name,
      displayOrder: 1,
    },
    {
      productId: respirateur.id,
      url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514',
      altText: respirateur.name,
      displayOrder: 1,
    },
  ]);

  console.log('Seed terminé avec succès');

  await app.close();
}

bootstrap();