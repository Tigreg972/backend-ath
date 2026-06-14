import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from '../app.module';

import { Category } from '../modules/catalog/entities/category.entity';
import {
  CategoryTranslation,
  CategoryTranslationLanguage,
} from '../modules/catalog/entities/category-translation.entity';

import { Product } from '../modules/catalog/entities/product.entity';
import { ProductImage } from '../modules/catalog/entities/product-image.entity';
import {
  ProductTranslation,
  ProductTranslationLanguage,
} from '../modules/catalog/entities/product-translation.entity';

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

function productImageUrl(index: number): string {
  return `/uploads/products/seed-product-${String(index).padStart(3, '0')}.jpg`;
}

function categoryImageUrl(slug: string): string {
  return `/uploads/categories/seed-category-${slug}.jpg`;
}

const productNameTranslations: Record<
  string,
  { en: string; ar: string; he: string }
> = {
  'Thermomètre infrarouge médical': {
    en: 'Infrared medical thermometer',
    ar: 'ميزان حرارة طبي بالأشعة تحت الحمراء',
    he: 'מד חום רפואי אינפרא אדום',
  },
  'Thermomètre frontal connecté': {
    en: 'Connected forehead thermometer',
    ar: 'ميزان حرارة جبهي ذكي',
    he: 'מד חום מצח חכם',
  },
  'Oxymètre de pouls professionnel': {
    en: 'Professional pulse oximeter',
    ar: 'مقياس تأكسج نبضي احترافي',
    he: 'מד סטורציה מקצועי',
  },
  'Tensiomètre bras automatique': {
    en: 'Automatic arm blood pressure monitor',
    ar: 'جهاز قياس ضغط الدم للذراع تلقائي',
    he: 'מד לחץ דם אוטומטי לזרוע',
  },
  'Tensiomètre poignet compact': {
    en: 'Compact wrist blood pressure monitor',
    ar: 'جهاز قياس ضغط الدم للمعصم مدمج',
    he: 'מד לחץ דם קומפקטי לפרק כף היד',
  },
  'Stéthoscope cardiologie': {
    en: 'Cardiology stethoscope',
    ar: 'سماعة طبية لأمراض القلب',
    he: 'סטטוסקופ קרדיולוגי',
  },
  'Stéthoscope standard adulte': {
    en: 'Standard adult stethoscope',
    ar: 'سماعة طبية قياسية للبالغين',
    he: 'סטטוסקופ סטנדרטי למבוגרים',
  },
  'Doppler fœtal portable': {
    en: 'Portable fetal doppler',
    ar: 'دوبلر جنيني محمول',
    he: 'דופלר עוברי נייד',
  },
  'Balance médicale numérique': {
    en: 'Digital medical scale',
    ar: 'ميزان طبي رقمي',
    he: 'משקל רפואי דיגיטלי',
  },
  'Glucomètre connecté': {
    en: 'Connected blood glucose meter',
    ar: 'جهاز قياس السكر الذكي',
    he: 'מד סוכר חכם',
  },

  'Scanner médical HD': {
    en: 'HD medical scanner',
    ar: 'ماسح طبي عالي الدقة',
    he: 'סורק רפואי HD',
  },
  'Échographe portable': {
    en: 'Portable ultrasound machine',
    ar: 'جهاز موجات فوق صوتية محمول',
    he: 'מכשיר אולטרסאונד נייד',
  },
  'Échographe haute résolution': {
    en: 'High-resolution ultrasound machine',
    ar: 'جهاز موجات فوق صوتية عالي الدقة',
    he: 'מכשיר אולטרסאונד ברזולוציה גבוהה',
  },
  'Moniteur médical 4K': {
    en: '4K medical monitor',
    ar: 'شاشة طبية 4K',
    he: 'מסך רפואי 4K',
  },
  'Station d’imagerie médicale': {
    en: 'Medical imaging workstation',
    ar: 'محطة عمل للتصوير الطبي',
    he: 'תחנת עבודה לדימות רפואי',
  },
  'Écran radiologie professionnel': {
    en: 'Professional radiology display',
    ar: 'شاشة أشعة احترافية',
    he: 'מסך רדיולוגיה מקצועי',
  },
  'Console DICOM': {
    en: 'DICOM console',
    ar: 'وحدة تحكم DICOM',
    he: 'קונסולת DICOM',
  },
  'Visualiseur d’imagerie médicale': {
    en: 'Medical image viewer',
    ar: 'عارض صور طبية',
    he: 'צופה תמונות רפואיות',
  },
  'Système PACS compact': {
    en: 'Compact PACS system',
    ar: 'نظام PACS مدمج',
    he: 'מערכת PACS קומפקטית',
  },
  'Imprimante médicale haute définition': {
    en: 'High-definition medical printer',
    ar: 'طابعة طبية عالية الدقة',
    he: 'מדפסת רפואית באיכות גבוהה',
  },

  'Respirateur médical': {
    en: 'Medical ventilator',
    ar: 'جهاز تنفس طبي',
    he: 'מכונת הנשמה רפואית',
  },
  'Concentrateur d’oxygène': {
    en: 'Oxygen concentrator',
    ar: 'مكثف أكسجين',
    he: 'רכז חמצן',
  },
  'Nébuliseur adulte': {
    en: 'Adult nebulizer',
    ar: 'جهاز تبخير للبالغين',
    he: 'נבולייזר למבוגרים',
  },
  'Nébuliseur enfant': {
    en: 'Children’s nebulizer',
    ar: 'جهاز تبخير للأطفال',
    he: 'נבולייזר לילדים',
  },
  'Masque à oxygène adulte': {
    en: 'Adult oxygen mask',
    ar: 'قناع أكسجين للبالغين',
    he: 'מסכת חמצן למבוגרים',
  },
  'Canule nasale oxygène': {
    en: 'Nasal oxygen cannula',
    ar: 'قنية أنفية للأكسجين',
    he: 'קנולה אפית לחמצן',
  },
  'Humidificateur respiratoire': {
    en: 'Respiratory humidifier',
    ar: 'مرطب تنفسي',
    he: 'מכשיר אדים נשימתי',
  },
  'Aspirateur de mucosités': {
    en: 'Mucus suction device',
    ar: 'جهاز شفط الإفرازات',
    he: 'מכשיר שאיבת הפרשות',
  },
  'Ventilateur de transport': {
    en: 'Transport ventilator',
    ar: 'جهاز تنفس للنقل',
    he: 'מנשם נייד להעברה',
  },
  'Kit d’oxygénothérapie': {
    en: 'Oxygen therapy kit',
    ar: 'مجموعة علاج بالأكسجين',
    he: 'ערכת טיפול בחמצן',
  },

  'Lampe scialytique LED': {
    en: 'LED surgical light',
    ar: 'مصباح جراحي LED',
    he: 'מנורת ניתוח LED',
  },
  'Table opératoire électrique': {
    en: 'Electric operating table',
    ar: 'طاولة عمليات كهربائية',
    he: 'שולחן ניתוחים חשמלי',
  },
  'Bistouri électrique': {
    en: 'Electrosurgical unit',
    ar: 'مشرط كهربائي',
    he: 'יחידת חיתוך חשמלית לניתוח',
  },
  'Aspirateur chirurgical': {
    en: 'Surgical suction device',
    ar: 'جهاز شفط جراحي',
    he: 'מכשיר שאיבה כירורגי',
  },
  'Plateau opératoire inox': {
    en: 'Stainless steel surgical tray',
    ar: 'صينية جراحية من الفولاذ المقاوم للصدأ',
    he: 'מגש ניתוח מנירוסטה',
  },
  'Instrumentation chirurgicale complète': {
    en: 'Complete surgical instrument set',
    ar: 'مجموعة أدوات جراحية كاملة',
    he: 'ערכת מכשירים כירורגיים מלאה',
  },
  'Moniteur anesthésie': {
    en: 'Anesthesia monitor',
    ar: 'جهاز مراقبة التخدير',
    he: 'מוניטור הרדמה',
  },
  'Pompe à perfusion': {
    en: 'Infusion pump',
    ar: 'مضخة تسريب',
    he: 'משאבת עירוי',
  },
  'Pompe seringue': {
    en: 'Syringe pump',
    ar: 'مضخة حقنة',
    he: 'משאבת מזרק',
  },
  'Défibrillateur professionnel': {
    en: 'Professional defibrillator',
    ar: 'جهاز إزالة رجفان احترافي',
    he: 'דפיברילטור מקצועי',
  },

  'Lit médicalisé électrique': {
    en: 'Electric medical bed',
    ar: 'سرير طبي كهربائي',
    he: 'מיטה רפואית חשמלית',
  },
  'Lit médicalisé manuel': {
    en: 'Manual medical bed',
    ar: 'سرير طبي يدوي',
    he: 'מיטה רפואית ידנית',
  },
  'Fauteuil roulant pliable': {
    en: 'Foldable wheelchair',
    ar: 'كرسي متحرك قابل للطي',
    he: 'כיסא גלגלים מתקפל',
  },
  'Fauteuil de transfert': {
    en: 'Transfer chair',
    ar: 'كرسي نقل طبي',
    he: 'כיסא העברה רפואי',
  },
  'Chariot de soins': {
    en: 'Medical care trolley',
    ar: 'عربة رعاية طبية',
    he: 'עגלת טיפול רפואית',
  },
  'Table d’examen médicale': {
    en: 'Medical examination table',
    ar: 'طاولة فحص طبية',
    he: 'שולחן בדיקה רפואי',
  },
  'Paravent médical trois panneaux': {
    en: 'Three-panel medical screen',
    ar: 'ستارة طبية بثلاث لوحات',
    he: 'פרגוד רפואי תלת-כנפי',
  },
  'Armoire médicale sécurisée': {
    en: 'Secure medical cabinet',
    ar: 'خزانة طبية آمنة',
    he: 'ארון רפואי מאובטח',
  },
  'Tabouret médical réglable': {
    en: 'Adjustable medical stool',
    ar: 'كرسي طبي قابل للتعديل',
    he: 'שרפרף רפואי מתכוונן',
  },
  'Marchepied médical antidérapant': {
    en: 'Non-slip medical step stool',
    ar: 'درج طبي مانع للانزلاق',
    he: 'שרפרף מדרגה רפואי נגד החלקה',
  },

  'Gel hydroalcoolique 5L': {
    en: '5L hydroalcoholic gel',
    ar: 'جل كحولي مائي 5 لتر',
    he: 'ג׳ל אלכוהולי 5 ליטר',
  },
  'Gants nitrile boîte de 100': {
    en: 'Nitrile gloves box of 100',
    ar: 'قفازات نيتريل علبة 100',
    he: 'כפפות ניטריל קופסה של 100',
  },
  'Gants latex boîte de 100': {
    en: 'Latex gloves box of 100',
    ar: 'قفازات لاتكس علبة 100',
    he: 'כפפות לטקס קופסה של 100',
  },
  'Masques chirurgicaux boîte de 50': {
    en: 'Surgical masks box of 50',
    ar: 'كمامات جراحية علبة 50',
    he: 'מסכות כירורגיות קופסה של 50',
  },
  'Masques FFP2 boîte de 20': {
    en: 'FFP2 masks box of 20',
    ar: 'كمامات FFP2 علبة 20',
    he: 'מסכות FFP2 קופסה של 20',
  },
  'Surblouse médicale jetable': {
    en: 'Disposable medical gown',
    ar: 'رداء طبي للاستعمال مرة واحدة',
    he: 'חלוק רפואי חד-פעמי',
  },
  'Charlotte médicale jetable': {
    en: 'Disposable medical cap',
    ar: 'غطاء رأس طبي للاستعمال مرة واحدة',
    he: 'כובע רפואי חד-פעמי',
  },
  'Lingettes désinfectantes médicales': {
    en: 'Medical disinfectant wipes',
    ar: 'مناديل طبية مطهرة',
    he: 'מגבוני חיטוי רפואיים',
  },
  'Compresses stériles': {
    en: 'Sterile gauze pads',
    ar: 'شاش طبي معقم',
    he: 'פדי גזה סטריליים',
  },
  'Collecteur DASRI 2L': {
    en: '2L medical waste sharps container',
    ar: 'حاوية نفايات طبية 2 لتر',
    he: 'מיכל פסולת רפואית 2 ליטר',
  },

  'Trousse de premiers secours': {
    en: 'First aid kit',
    ar: 'حقيبة إسعافات أولية',
    he: 'ערכת עזרה ראשונה',
  },
  'Sac d’urgence médical': {
    en: 'Medical emergency bag',
    ar: 'حقيبة طوارئ طبية',
    he: 'תיק חירום רפואי',
  },
  'Brancard pliable aluminium': {
    en: 'Foldable aluminum stretcher',
    ar: 'نقالة ألمنيوم قابلة للطي',
    he: 'אלונקה מתקפלת מאלומיניום',
  },
  'Couverture de survie': {
    en: 'Emergency survival blanket',
    ar: 'بطانية نجاة للطوارئ',
    he: 'שמיכת חירום תרמית',
  },
  'Kit brûlures médical': {
    en: 'Medical burn kit',
    ar: 'مجموعة طبية للحروق',
    he: 'ערכת כוויות רפואית',
  },
  'Attelle gonflable': {
    en: 'Inflatable splint',
    ar: 'جبيرة قابلة للنفخ',
    he: 'סד מתנפח',
  },
  'Collier cervical réglable': {
    en: 'Adjustable cervical collar',
    ar: 'طوق رقبة قابل للتعديل',
    he: 'קולר צווארי מתכוונן',
  },
  'Mannequin RCP formation': {
    en: 'CPR training mannequin',
    ar: 'دمية تدريب للإنعاش القلبي الرئوي',
    he: 'בובת הדרכה להחייאה',
  },
  'Masque bouche-à-bouche': {
    en: 'Mouth-to-mouth resuscitation mask',
    ar: 'قناع إنعاش فموي',
    he: 'מסכת הנשמה מפה לפה',
  },
  'Défibrillateur automatique externe': {
    en: 'Automated external defibrillator',
    ar: 'جهاز إزالة رجفان خارجي آلي',
    he: 'דפיברילטור חיצוני אוטומטי',
  },

  'Microscope binoculaire': {
    en: 'Binocular microscope',
    ar: 'مجهر ثنائي العدسة',
    he: 'מיקרוסקופ בינוקולרי',
  },
  'Centrifugeuse de laboratoire': {
    en: 'Laboratory centrifuge',
    ar: 'جهاز طرد مركزي للمختبر',
    he: 'צנטריפוגה למעבדה',
  },
  'Pipette électronique': {
    en: 'Electronic pipette',
    ar: 'ماصة إلكترونية',
    he: 'פיפטה אלקטרונית',
  },
  'Agitateur magnétique chauffant': {
    en: 'Heating magnetic stirrer',
    ar: 'محرك مغناطيسي حراري',
    he: 'מערבל מגנטי מחמם',
  },
  'Balance de précision laboratoire': {
    en: 'Laboratory precision scale',
    ar: 'ميزان دقيق للمختبر',
    he: 'מאזניים מדויקים למעבדה',
  },
  'Incubateur de laboratoire': {
    en: 'Laboratory incubator',
    ar: 'حاضنة مختبرية',
    he: 'אינקובטור למעבדה',
  },
  'Réfrigérateur médical': {
    en: 'Medical refrigerator',
    ar: 'ثلاجة طبية',
    he: 'מקרר רפואי',
  },
  'Analyseur biochimique compact': {
    en: 'Compact biochemical analyzer',
    ar: 'محلل كيمياء حيوية مدمج',
    he: 'מנתח ביוכימי קומפקטי',
  },
  'Boîte de lames microscope': {
    en: 'Microscope slide box',
    ar: 'علبة شرائح مجهر',
    he: 'קופסת זכוכיות למיקרוסקופ',
  },
  'Tubes de prélèvement boîte de 100': {
    en: 'Blood collection tubes box of 100',
    ar: 'أنابيب سحب عينات علبة 100',
    he: 'מבחנות איסוף דם קופסה של 100',
  },
};

function buildProductTranslations(name: string) {
  const translated = productNameTranslations[name] || {
    en: name,
    ar: name,
    he: name,
  };

  return {
    en: {
      name: translated.en,
      shortDescription: `${translated.en} for professional medical use.`,
      description: `${translated.en} designed for medical offices, clinics and healthcare facilities.`,
      techSpecs: {
        usage: 'Professional',
        warranty: '2 years',
        certification: 'Medical CE',
      },
    },
    ar: {
      name: translated.ar,
      shortDescription: `${translated.ar} للاستخدام الطبي الاحترافي.`,
      description: `${translated.ar} مصمم للعيادات والمراكز الطبية والمؤسسات الصحية.`,
      techSpecs: {
        usage: 'احترافي',
        warranty: 'سنتان',
        certification: 'CE طبي',
      },
    },
    he: {
      name: translated.he,
      shortDescription: `${translated.he} לשימוש רפואי מקצועי.`,
      description: `${translated.he} מיועד למרפאות, קליניקות ומוסדות בריאות.`,
      techSpecs: {
        usage: 'מקצועי',
        warranty: 'שנתיים',
        certification: 'CE רפואי',
      },
    },
  };
}
async function bootstrap() {
  console.log('SEED START');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const categoriesRepository = dataSource.getRepository(Category);
  const categoryTranslationsRepository =
    dataSource.getRepository(CategoryTranslation);
  const productsRepository = dataSource.getRepository(Product);
  const productTranslationsRepository =
    dataSource.getRepository(ProductTranslation);
  const imagesRepository = dataSource.getRepository(ProductImage);
  const slidesRepository = dataSource.getRepository(HomeSlide);
  const homeContentRepository = dataSource.getRepository(HomeContent);

  console.log('Suppression anciennes données...');

  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

  await dataSource.query('TRUNCATE TABLE cart_items');
  await dataSource.query('TRUNCATE TABLE order_items');
  await dataSource.query('TRUNCATE TABLE orders');
  await dataSource.query('TRUNCATE TABLE product_translations');
  await dataSource.query('TRUNCATE TABLE category_translations');
  await dataSource.query('TRUNCATE TABLE product_images');
  await dataSource.query('TRUNCATE TABLE products');
  await dataSource.query('TRUNCATE TABLE categories');
  await dataSource.query('TRUNCATE TABLE home_slides');
  await dataSource.query('TRUNCATE TABLE home_content');

  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('Création catégories...');

  const categoryTranslations: Record<
    string,
    {
      en: { name: string; description: string };
      ar: { name: string; description: string };
      he: { name: string; description: string };
    }
  > = {
    diagnostic: {
      en: {
        name: 'Diagnostic',
        description:
          'Medical diagnostic equipment for clinics and healthcare facilities.',
      },
      ar: {
        name: 'التشخيص',
        description: 'معدات التشخيص الطبي للعيادات والمؤسسات الصحية.',
      },
      he: {
        name: 'אבחון',
        description: 'ציוד אבחון רפואי למרפאות ולמוסדות בריאות.',
      },
    },
    'imagerie-medicale': {
      en: {
        name: 'Medical imaging',
        description:
          'Professional equipment dedicated to medical imaging and analysis.',
      },
      ar: {
        name: 'التصوير الطبي',
        description: 'معدات احترافية مخصصة للتصوير والتحليل الطبي.',
      },
      he: {
        name: 'דימות רפואי',
        description: 'ציוד מקצועי המיועד לדימות וניתוח רפואי.',
      },
    },
    respiratoire: {
      en: {
        name: 'Respiratory',
        description:
          'Respiratory solutions for care, emergency and oxygen therapy.',
      },
      ar: {
        name: 'الجهاز التنفسي',
        description: 'حلول تنفسية للرعاية والطوارئ والعلاج بالأكسجين.',
      },
      he: {
        name: 'נשימתי',
        description: 'פתרונות נשימתיים לטיפול, חירום וטיפול בחמצן.',
      },
    },
    'bloc-operatoire': {
      en: {
        name: 'Operating room',
        description: 'Equipment for surgical procedures and operating rooms.',
      },
      ar: {
        name: 'غرفة العمليات',
        description: 'معدات مخصصة للتدخلات الجراحية وغرف العمليات.',
      },
      he: {
        name: 'חדר ניתוח',
        description: 'ציוד המיועד להליכים כירורגיים ולחדרי ניתוח.',
      },
    },
    'mobilier-medical': {
      en: {
        name: 'Medical furniture',
        description:
          'Professional furniture for medical offices, clinics and hospitals.',
      },
      ar: {
        name: 'الأثاث الطبي',
        description: 'أثاث احترافي للعيادات والمستشفيات والمراكز الطبية.',
      },
      he: {
        name: 'ריהוט רפואי',
        description: 'ריהוט מקצועי למרפאות, קליניקות ובתי חולים.',
      },
    },
    'hygiene-medicale': {
      en: {
        name: 'Medical hygiene',
        description: 'Medical hygiene, protection and disinfection products.',
      },
      ar: {
        name: 'النظافة الطبية',
        description: 'منتجات النظافة والحماية والتطهير الطبي.',
      },
      he: {
        name: 'היגיינה רפואית',
        description: 'מוצרי היגיינה, הגנה וחיטוי רפואיים.',
      },
    },
    'urgence-premiers-secours': {
      en: {
        name: 'Emergency and first aid',
        description: 'Emergency, first aid and rapid intervention equipment.',
      },
      ar: {
        name: 'الطوارئ والإسعافات الأولية',
        description: 'معدات الطوارئ والإسعافات والتدخل السريع.',
      },
      he: {
        name: 'חירום ועזרה ראשונה',
        description: 'ציוד חירום, עזרה ראשונה והתערבות מהירה.',
      },
    },
    laboratoire: {
      en: {
        name: 'Laboratory',
        description:
          'Equipment and consumables for medical laboratories and analysis.',
      },
      ar: {
        name: 'المختبر',
        description: 'معدات ومستهلكات للتحليلات والمختبرات الطبية.',
      },
      he: {
        name: 'מעבדה',
        description: 'ציוד וחומרים מתכלים לבדיקות ולמעבדות רפואיות.',
      },
    },
  };

  const categorySeeds = [
    {
      name: 'Diagnostic',
      slug: 'diagnostic',
      description:
        'Matériel de diagnostic médical pour cabinets et établissements de santé.',
      displayOrder: 1,
    },
    {
      name: 'Imagerie médicale',
      slug: 'imagerie-medicale',
      description:
        'Équipements professionnels dédiés à l’imagerie et à l’analyse médicale.',
      displayOrder: 2,
    },
    {
      name: 'Respiratoire',
      slug: 'respiratoire',
      description:
        'Solutions respiratoires pour soins, urgence et oxygénothérapie.',
      displayOrder: 3,
    },
    {
      name: 'Bloc opératoire',
      slug: 'bloc-operatoire',
      description:
        'Équipements destinés aux interventions chirurgicales et aux blocs opératoires.',
      displayOrder: 4,
    },
    {
      name: 'Mobilier médical',
      slug: 'mobilier-medical',
      description:
        'Mobilier professionnel pour cabinets, cliniques et hôpitaux.',
      displayOrder: 5,
    },
    {
      name: 'Hygiène médicale',
      slug: 'hygiene-medicale',
      description:
        'Produits d’hygiène, protection et désinfection médicale.',
      displayOrder: 6,
    },
    {
      name: 'Urgence et premiers secours',
      slug: 'urgence-premiers-secours',
      description: 'Matériel d’urgence, secours et intervention rapide.',
      displayOrder: 7,
    },
    {
      name: 'Laboratoire',
      slug: 'laboratoire',
      description:
        'Équipements et consommables pour analyses et laboratoires médicaux.',
      displayOrder: 8,
    },
  ];

  const categories = await categoriesRepository.save(
    categorySeeds.map((category) => ({
      ...category,
      imageUrl: categoryImageUrl(category.slug),
      isActive: true,
    })),
  );

  for (const category of categories) {
    const translations = categoryTranslations[category.slug];

    await categoryTranslationsRepository.save([
      {
        categoryId: category.id,
        language: CategoryTranslationLanguage.EN,
        name: translations.en.name,
        description: translations.en.description,
      },
      {
        categoryId: category.id,
        language: CategoryTranslationLanguage.AR,
        name: translations.ar.name,
        description: translations.ar.description,
      },
      {
        categoryId: category.id,
        language: CategoryTranslationLanguage.HE,
        name: translations.he.name,
        description: translations.he.description,
      },
    ]);
  }

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
      url: productImageUrl(index),
      altText: product.name,
      displayOrder: 0,
    });

    const translations = buildProductTranslations(product.name);

    await productTranslationsRepository.save([
      {
        productId: product.id,
        language: ProductTranslationLanguage.EN,
        name: translations.en.name,
        shortDescription: translations.en.shortDescription,
        description: translations.en.description,
        techSpecs: translations.en.techSpecs,
      },
      {
        productId: product.id,
        language: ProductTranslationLanguage.AR,
        name: translations.ar.name,
        shortDescription: translations.ar.shortDescription,
        description: translations.ar.description,
        techSpecs: translations.ar.techSpecs,
      },
      {
        productId: product.id,
        language: ProductTranslationLanguage.HE,
        name: translations.he.name,
        shortDescription: translations.he.shortDescription,
        description: translations.he.description,
        techSpecs: translations.he.techSpecs,
      },
    ]);

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
      subtitle: 'Des équipements fiables pour les professionnels de santé',
      imageUrl: '/uploads/home/seed-slide-1.jpg',
      ctaLabel: 'Voir le catalogue',
      ctaUrl: '/catalog',
      displayOrder: 1,
      isActive: true,
    },
    {
      title: 'Diagnostic et surveillance',
      subtitle: 'Thermomètres, tensiomètres, ECG et matériel de contrôle',
      imageUrl: '/uploads/home/seed-slide-2.jpg',
      ctaLabel: 'Découvrir',
      ctaUrl: '/catalog',
      displayOrder: 2,
      isActive: true,
    },
    {
      title: 'Équipements hospitaliers',
      subtitle: 'Mobilier médical, respiratoire et bloc opératoire',
      imageUrl: '/uploads/home/seed-slide-3.jpg',
      ctaLabel: 'Nos produits',
      ctaUrl: '/catalog',
      displayOrder: 3,
      isActive: true,
    },
  ]);

  console.log(
    `Seed terminé avec succès : ${productsData.length} produits créés avec traductions`,
  );

  await app.close();
}

bootstrap();