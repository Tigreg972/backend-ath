import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from '../app.module';

import { Category } from '../modules/catalog/entities/category.entity';
import { Product } from '../modules/catalog/entities/product.entity';
import { ProductImage } from '../modules/catalog/entities/product-image.entity';
import { HomeSlide } from '../modules/home/entities/home-slide.entity';
import { HomeContent } from '../modules/home/entities/home-content.entity';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function productImageUrl(productName: string): string {
  const query = encodeURIComponent(`${productName} matériel médical`);
  return `https://tse1.mm.bing.net/th?q=${query}&w=900&h=600&c=7&rs=1&p=0&o=5&pid=1.7`;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const categoriesRepository = dataSource.getRepository(Category);
  const productsRepository = dataSource.getRepository(Product);
  const imagesRepository = dataSource.getRepository(ProductImage);
  const slidesRepository = dataSource.getRepository(HomeSlide);
  const homeContentRepository = dataSource.getRepository(HomeContent);

  console.log('Suppression anciennes données...');

  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

  await dataSource.query('TRUNCATE TABLE cart_items');
  await dataSource.query('TRUNCATE TABLE order_items');
  await dataSource.query('TRUNCATE TABLE orders');
  await dataSource.query('TRUNCATE TABLE product_images');
  await dataSource.query('TRUNCATE TABLE products');
  await dataSource.query('TRUNCATE TABLE categories');
  await dataSource.query('TRUNCATE TABLE home_slides');
  await dataSource.query('TRUNCATE TABLE home_content');

  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('Création catégories...');

  const categories = await categoriesRepository.save([
    {
      name: 'Diagnostic',
      slug: 'diagnostic',
      description:
        'Matériel de diagnostic médical pour cabinets et établissements de santé.',
      imageUrl:
        'https://tse1.mm.bing.net/th?q=matériel+diagnostic+médical&w=900&h=600&c=7&rs=1&p=0&o=5&pid=1.7',
      displayOrder: 1,
      isActive: true,
    },
    {
      name: 'Imagerie médicale',
      slug: 'imagerie-medicale',
      description:
        'Équipements professionnels dédiés à l’imagerie et à l’analyse médicale.',
      imageUrl:
        'https://tse1.mm.bing.net/th?q=scanner+médical+imagerie&w=900&h=600&c=7&rs=1&p=0&o=5&pid=1.7',
      displayOrder: 2,
      isActive: true,
    },
    {
      name: 'Respiratoire',
      slug: 'respiratoire',
      description:
        'Solutions respiratoires pour soins, urgence et oxygénothérapie.',
      imageUrl:
        'https://tse1.mm.bing.net/th?q=respirateur+médical+oxygène&w=900&h=600&c=7&rs=1&p=0&o=5&pid=1.7',
      displayOrder: 3,
      isActive: true,
    },
    {
      name: 'Bloc opératoire',
      slug: 'bloc-operatoire',
      description:
        'Équipements destinés aux interventions chirurgicales et aux blocs opératoires.',
      imageUrl:
        'https://tse1.mm.bing.net/th?q=bloc+opératoire+matériel+chirurgical&w=900&h=600&c=7&rs=1&p=0&o=5&pid=1.7',
      displayOrder: 4,
      isActive: true,
    },
    {
      name: 'Mobilier médical',
      slug: 'mobilier-medical',
      description:
        'Mobilier professionnel pour cabinets, cliniques et hôpitaux.',
      imageUrl:
        'https://tse1.mm.bing.net/th?q=lit+médicalisé+mobilier+médical&w=900&h=600&c=7&rs=1&p=0&o=5&pid=1.7',
      displayOrder: 5,
      isActive: true,
    },
    {
      name: 'Hygiène médicale',
      slug: 'hygiene-medicale',
      description:
        'Produits d’hygiène, protection et désinfection médicale.',
      imageUrl:
        'https://tse1.mm.bing.net/th?q=gants+masques+hygiène+médicale&w=900&h=600&c=7&rs=1&p=0&o=5&pid=1.7',
      displayOrder: 6,
      isActive: true,
    },
    {
      name: 'Urgence et premiers secours',
      slug: 'urgence-premiers-secours',
      description:
        'Matériel d’urgence, secours et intervention rapide.',
      imageUrl:
        'https://tse1.mm.bing.net/th?q=trousse+premiers+secours+médical&w=900&h=600&c=7&rs=1&p=0&o=5&pid=1.7',
      displayOrder: 7,
      isActive: true,
    },
    {
      name: 'Laboratoire',
      slug: 'laboratoire',
      description:
        'Équipements et consommables pour analyses et laboratoires médicaux.',
      imageUrl:
        'https://tse1.mm.bing.net/th?q=laboratoire+médical+microscope&w=900&h=600&c=7&rs=1&p=0&o=5&pid=1.7',
      displayOrder: 8,
      isActive: true,
    },
  ]);

  const categoryByName = Object.fromEntries(
    categories.map((category) => [category.name, category]),
  );

  const productsData: [string, string, number, number][] = [
    ['Diagnostic', 'Thermomètre infrarouge médical', 2099, 40],
    ['Diagnostic', 'Thermomètre frontal connecté', 3499, 32],
    ['Diagnostic', 'Oxymètre de pouls professionnel', 2999, 55],
    ['Diagnostic', 'Tensiomètre bras automatique', 5999, 28],
    ['Diagnostic', 'Tensiomètre poignet compact', 3999, 35],
    ['Diagnostic', 'Stéthoscope cardiologie', 8999, 22],
    ['Diagnostic', 'Stéthoscope standard adulte', 2999, 60],
    ['Diagnostic', 'Doppler fœtal portable', 12999, 15],
    ['Diagnostic', 'Balance médicale numérique', 7499, 20],
    ['Diagnostic', 'Glucomètre connecté', 3999, 45],

    ['Imagerie médicale', 'Scanner médical HD', 499999, 6],
    ['Imagerie médicale', 'Échographe portable', 299999, 8],
    ['Imagerie médicale', 'Échographe haute résolution', 749999, 4],
    ['Imagerie médicale', 'Moniteur médical 4K', 149999, 10],
    ['Imagerie médicale', 'Station d’imagerie médicale', 229999, 7],
    ['Imagerie médicale', 'Écran radiologie professionnel', 189999, 9],
    ['Imagerie médicale', 'Console DICOM', 119999, 12],
    ['Imagerie médicale', 'Visualiseur d’imagerie médicale', 89999, 14],
    ['Imagerie médicale', 'Système PACS compact', 399999, 5],
    ['Imagerie médicale', 'Imprimante médicale haute définition', 159999, 8],

    ['Respiratoire', 'Respirateur médical', 899999, 5],
    ['Respiratoire', 'Concentrateur d’oxygène', 79999, 12],
    ['Respiratoire', 'Nébuliseur adulte', 4499, 50],
    ['Respiratoire', 'Nébuliseur enfant', 3999, 42],
    ['Respiratoire', 'Masque à oxygène adulte', 1299, 100],
    ['Respiratoire', 'Canule nasale oxygène', 899, 120],
    ['Respiratoire', 'Humidificateur respiratoire', 24999, 18],
    ['Respiratoire', 'Aspirateur de mucosités', 59999, 11],
    ['Respiratoire', 'Ventilateur de transport', 349999, 6],
    ['Respiratoire', 'Kit d’oxygénothérapie', 19999, 25],

    ['Bloc opératoire', 'Lampe scialytique LED', 249999, 6],
    ['Bloc opératoire', 'Table opératoire électrique', 699999, 3],
    ['Bloc opératoire', 'Bistouri électrique', 149999, 8],
    ['Bloc opératoire', 'Aspirateur chirurgical', 89999, 10],
    ['Bloc opératoire', 'Plateau opératoire inox', 9999, 30],
    ['Bloc opératoire', 'Instrumentation chirurgicale complète', 79999, 12],
    ['Bloc opératoire', 'Moniteur anesthésie', 299999, 5],
    ['Bloc opératoire', 'Pompe à perfusion', 69999, 18],
    ['Bloc opératoire', 'Pompe seringue', 64999, 16],
    ['Bloc opératoire', 'Défibrillateur professionnel', 129999, 9],

    ['Mobilier médical', 'Lit médicalisé électrique', 119999, 10],
    ['Mobilier médical', 'Lit médicalisé manuel', 69999, 14],
    ['Mobilier médical', 'Fauteuil roulant pliable', 24999, 25],
    ['Mobilier médical', 'Fauteuil de transfert', 19999, 22],
    ['Mobilier médical', 'Chariot de soins', 39999, 18],
    ['Mobilier médical', 'Table d’examen médicale', 49999, 15],
    ['Mobilier médical', 'Paravent médical trois panneaux', 8999, 35],
    ['Mobilier médical', 'Armoire médicale sécurisée', 59999, 12],
    ['Mobilier médical', 'Tabouret médical réglable', 7999, 45],
    ['Mobilier médical', 'Marchepied médical antidérapant', 3999, 50],

    ['Hygiène médicale', 'Gel hydroalcoolique 5L', 2499, 100],
    ['Hygiène médicale', 'Gants nitrile boîte de 100', 1299, 150],
    ['Hygiène médicale', 'Gants latex boîte de 100', 1099, 130],
    ['Hygiène médicale', 'Masques chirurgicaux boîte de 50', 999, 200],
    ['Hygiène médicale', 'Masques FFP2 boîte de 20', 1899, 160],
    ['Hygiène médicale', 'Surblouse médicale jetable', 799, 180],
    ['Hygiène médicale', 'Charlotte médicale jetable', 499, 220],
    ['Hygiène médicale', 'Lingettes désinfectantes médicales', 1499, 140],
    ['Hygiène médicale', 'Compresses stériles', 699, 170],
    ['Hygiène médicale', 'Collecteur DASRI 2L', 899, 90],

    ['Urgence et premiers secours', 'Trousse de premiers secours', 2999, 60],
    ['Urgence et premiers secours', 'Sac d’urgence médical', 8999, 25],
    ['Urgence et premiers secours', 'Brancard pliable aluminium', 49999, 10],
    ['Urgence et premiers secours', 'Couverture de survie', 299, 300],
    ['Urgence et premiers secours', 'Kit brûlures médical', 2499, 80],
    ['Urgence et premiers secours', 'Attelle gonflable', 1999, 70],
    ['Urgence et premiers secours', 'Collier cervical réglable', 1499, 85],
    ['Urgence et premiers secours', 'Mannequin RCP formation', 79999, 8],
    ['Urgence et premiers secours', 'Masque bouche-à-bouche', 799, 100],
    ['Urgence et premiers secours', 'Défibrillateur automatique externe', 119999, 7],

    ['Laboratoire', 'Microscope binoculaire', 99999, 12],
    ['Laboratoire', 'Centrifugeuse de laboratoire', 84999, 10],
    ['Laboratoire', 'Pipette électronique', 29999, 20],
    ['Laboratoire', 'Agitateur magnétique chauffant', 39999, 14],
    ['Laboratoire', 'Balance de précision laboratoire', 59999, 18],
    ['Laboratoire', 'Incubateur de laboratoire', 129999, 6],
    ['Laboratoire', 'Réfrigérateur médical', 149999, 5],
    ['Laboratoire', 'Analyseur biochimique compact', 349999, 4],
    ['Laboratoire', 'Boîte de lames microscope', 999, 200],
    ['Laboratoire', 'Tubes de prélèvement boîte de 100', 1299, 180],
  ];

  console.log('Création produits...');

  let index = 1;

  for (const [categoryName, name, priceCents, stock] of productsData) {
    const category = categoryByName[categoryName];

    if (!category) {
      throw new Error(`Catégorie introuvable : ${categoryName}`);
    }

    const product = await productsRepository.save({
      sku: `ALT-${String(index).padStart(3, '0')}`,
      name,
      slug: slugify(name),
      shortDescription: `${name} pour usage médical professionnel.`,
      description: `${name} conçu pour répondre aux besoins des cabinets médicaux, cliniques et établissements de santé.`,
      techSpecs: {
        usage: 'Professionnel',
        garantie: '2 ans',
        certification: 'CE médical',
      },
      priceCents,
      stock,
      priority: 100 - index,
      isActive: true,
      isFeatured: index <= 12,
      categoryId: category.id,
    });

    await imagesRepository.save({
      productId: product.id,
      url: productImageUrl(product.name),
      altText: product.name,
      displayOrder: 0,
    });

    index++;
  }

  console.log('Création accueil...');

  await homeContentRepository.save({
    id: 1,
    homeText:
      'Découvrez notre sélection de matériel médical professionnel destinée aux cabinets médicaux, cliniques, laboratoires et établissements de santé.',
  });

  await slidesRepository.save([
    {
      title: 'Matériel médical professionnel',
      subtitle:
        'Des équipements fiables pour les professionnels de santé',
      imageUrl:
        'https://tse1.mm.bing.net/th?q=matériel+médical+professionnel&w=1200&h=600&c=7&rs=1&p=0&o=5&pid=1.7',
      ctaLabel: 'Voir le catalogue',
      ctaUrl: '/catalog',
      displayOrder: 1,
      isActive: true,
    },
    {
      title: 'Diagnostic et surveillance',
      subtitle:
        'Thermomètres, tensiomètres, ECG et matériel de contrôle',
      imageUrl:
        'https://tse1.mm.bing.net/th?q=diagnostic+médical+tensiomètre+oxymètre&w=1200&h=600&c=7&rs=1&p=0&o=5&pid=1.7',
      ctaLabel: 'Découvrir',
      ctaUrl: '/catalog',
      displayOrder: 2,
      isActive: true,
    },
    {
      title: 'Équipements hospitaliers',
      subtitle:
        'Mobilier médical, respiratoire et bloc opératoire',
      imageUrl:
        'https://tse1.mm.bing.net/th?q=équipement+hospitalier+bloc+opératoire&w=1200&h=600&c=7&rs=1&p=0&o=5&pid=1.7',
      ctaLabel: 'Nos produits',
      ctaUrl: '/catalog',
      displayOrder: 3,
      isActive: true,
    },
  ]);

  console.log(`Seed terminé avec succès : ${productsData.length} produits créés`);

  await app.close();
}

bootstrap();