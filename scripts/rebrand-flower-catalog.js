require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const categories = [
  {
    key: "bouquets",
    name: "دسته‌گل‌های تازه",
    description: "دسته‌گل‌های تازه و دست‌ساز برای هدیه و لحظه‌های خاص",
    legacyNames: ["لوازم بهداشتی"],
  },
  {
    key: "occasions",
    name: "گل‌های مناسبتی و باکس",
    description: "باکس گل و چیدمان‌های رنگارنگ برای مناسبت‌های دوست‌داشتنی",
    legacyNames: ["لوازم آرایشی"],
  },
  {
    key: "plants",
    name: "گیاهان آپارتمانی",
    description: "گیاهان سبز و مقاوم برای خانه و محل کار",
    legacyNames: ["مراقبت از پوست"],
  },
];

const products = [
  {
    previousName: "چراغ خطر موتور سیکلت وارون مدل پروازی",
    name: "دسته‌گل رز صورتی",
    description: "دسته‌گلی دست‌ساز از رزهای صورتی تازه، مناسب تولد و سالگرد.",
    price: 1890000,
    discountPrice: 1690000,
    stock: 20,
    image:
      "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=85",
    category: "bouquets",
    attributes: {
      flower: "رز هلندی",
      color: "صورتی",
      occasion: "تولد و سالگرد",
    },
  },
  {
    previousName: "چراغ پرژکتور موتورسیکلت فرهاد مدل MF12",
    name: "دسته‌گل رز قرمز",
    description: "رزهای قرمز کلاسیک برای ابراز عشق و ساختن یک خاطره‌ی ماندگار.",
    price: 2190000,
    discountPrice: 1990000,
    stock: 16,
    image:
      "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=900&q=85",
    category: "bouquets",
    attributes: { flower: "رز", color: "قرمز", occasion: "عاشقانه" },
  },
  {
    previousName: "باک موتورسیکلت تیزرو مدلM10000",
    name: "باکس گل بهاری",
    description: "ترکیبی رنگارنگ از گل‌های فصلی در یک باکس شیک و آماده‌ی هدیه.",
    price: 2490000,
    discountPrice: 2290000,
    stock: 18,
    image:
      "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=85",
    category: "occasions",
    attributes: { flowers: "رز و ژربرا", color: "ترکیبی", occasion: "هدیه" },
  },
  {
    previousName: "پرژکتور موتورسیکلت مدل Angel eye",
    name: "دسته‌گل ژربرا رنگارنگ",
    description: "ژربراهای شاد و تازه برای تبریک، تشکر و خوشحال کردن عزیزان.",
    price: 1590000,
    discountPrice: null,
    stock: 24,
    image:
      "https://images.unsplash.com/photo-1494972308805-463bc619d34e?auto=format&fit=crop&w=900&q=85",
    category: "occasions",
    attributes: { flower: "ژربرا", color: "رنگارنگ", occasion: "تبریک و تشکر" },
  },
  {
    previousName: "کیلومتر موتور سیکلت مدل PRIDE 01",
    name: "پتوس سبز آپارتمانی",
    description: "پتوس سرحال و کم‌دردسر برای تازه کردن فضای خانه یا محل کار.",
    price: 890000,
    discountPrice: null,
    stock: 25,
    image:
      "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=85",
    category: "plants",
    attributes: { plant: "پتوس", care: "آسان", placement: "فضای داخلی" },
  },
  {
    previousName: "چراغ جلو ال ای دی موتور سیکلت وارون",
    name: "دسته‌گل لاله‌های بهاری",
    description: "لاله‌های تازه و رنگارنگ، انتخابی لطیف برای هدیه‌ای بهاری.",
    price: 1390000,
    discountPrice: 1290000,
    stock: 22,
    image:
      "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=900&q=85",
    category: "bouquets",
    attributes: { flower: "لاله", color: "ترکیبی", occasion: "بهار" },
  },
  {
    previousName: "چراغ راهنما موتور سیکلت مدل نئونی فانتزی",
    name: "دسته‌گل آفتابگردان",
    description: "آفتابگردان‌های پرانرژی برای هدیه دادن حس خوب و روزهای روشن.",
    price: 1250000,
    discountPrice: null,
    stock: 30,
    image:
      "https://images.unsplash.com/photo-1597848212624-e6e8d9f3f5b5?auto=format&fit=crop&w=900&q=85",
    category: "occasions",
    attributes: {
      flower: "آفتابگردان",
      color: "زرد",
      occasion: "تبریک و تشکر",
    },
  },
  {
    previousName: "باتری",
    name: "سانسوریا آپارتمانی",
    description:
      "سانسوریای مقاوم و زیبا؛ گیاهی مناسب برای نگهداری در فضای داخلی.",
    price: 1450000,
    discountPrice: null,
    stock: 15,
    image:
      "https://images.unsplash.com/photo-1593691509543-c55fb32d8de5?auto=format&fit=crop&w=900&q=85",
    category: "plants",
    attributes: { plant: "سانسوریا", care: "آسان", placement: "فضای داخلی" },
  },
  {
    previousName: "کرم دست",
    name: "ارکیده‌ی سفید",
    description: "ارکیده‌ی سفید و ظریف برای خانه، محل کار یا یک هدیه‌ی رسمی.",
    price: 1990000,
    discountPrice: 1890000,
    stock: 12,
    image:
      "https://images.unsplash.com/photo-1566943384924-2e6a3d8f6c30?auto=format&fit=crop&w=900&q=85",
    category: "plants",
    attributes: { flower: "ارکیده", color: "سفید", placement: "فضای داخلی" },
  },
];

async function main() {
  const result = await prisma.$transaction(async (transaction) => {
    const categoryIds = {};
    let categoriesUpdated = 0;
    const existingProducts = await transaction.product.findMany({
      select: { id: true, name: true },
    });
    const productsByName = new Map(
      existingProducts.map((product) => [product.name.trim(), product]),
    );

    for (const category of categories) {
      const existing = await transaction.category.findFirst({
        where: { name: { in: [category.name, ...category.legacyNames] } },
      });

      const saved = existing
        ? await transaction.category.update({
            where: { id: existing.id },
            data: { name: category.name, description: category.description },
          })
        : await transaction.category.create({
            data: { name: category.name, description: category.description },
          });

      categoryIds[category.key] = saved.id;
      categoriesUpdated += 1;
    }

    let productsUpdated = 0;
    let productsCreated = 0;

    for (const product of products) {
      const existing =
        productsByName.get(product.previousName.trim()) ||
        productsByName.get(product.name);
      const data = {
        name: product.name,
        description: product.description,
        price: product.price,
        discountPrice: product.discountPrice,
        stock: product.stock,
        images: [product.image],
        categoryId: categoryIds[product.category],
        attributes: product.attributes,
      };

      if (existing) {
        await transaction.product.update({ where: { id: existing.id }, data });
        productsUpdated += 1;
      } else {
        const created = await transaction.product.create({ data });
        productsByName.set(product.name, created);
        productsCreated += 1;
      }
    }

    return { categoriesUpdated, productsUpdated, productsCreated };
  });

  console.log("Flower-shop catalog updated:", JSON.stringify(result));
}

main()
  .catch((error) => {
    console.error("Catalog update failed:", error.code || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
