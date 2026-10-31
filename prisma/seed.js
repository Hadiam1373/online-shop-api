const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Create categories
  const bouquets = await prisma.category.create({
    data: {
      name: "دسته‌گل و گل‌آرایی",
      description: "دسته‌گل‌های تازه برای هدیه و مناسبت‌های خاص",
    },
  });

  const plants = await prisma.category.create({
    data: {
      name: "گیاهان آپارتمانی",
      description: "گیاهان سبز برای خانه و محل کار",
    },
  });

  // Create products
  await prisma.product.createMany({
    data: [
      {
        name: "دسته‌گل رز صورتی",
        description: "دسته‌گلی دست‌ساز از رزهای صورتی برای تولد و سالگرد",
        price: 1890000,
        discountPrice: 1690000,
        stock: 20,
        images: [
          "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=85",
        ],
        categoryId: bouquets.id,
        attributes: {
          flower: "رز هلندی",
          color: "صورتی",
          occasion: "تولد و سالگرد",
        },
      },
      {
        name: "دسته‌گل آفتابگردان",
        description: "ترکیبی پرانرژی از آفتابگردان‌های تازه برای هدیه دادن",
        price: 1250000,
        stock: 30,
        images: [
          "https://images.unsplash.com/photo-1597848212624-e6e8d9f3f5b5?auto=format&fit=crop&w=900&q=85",
        ],
        categoryId: bouquets.id,
        attributes: {
          flower: "آفتابگردان",
          color: "زرد",
          occasion: "تبریک و تشکر",
        },
      },
      {
        name: "گیاه آپارتمانی پتوس",
        description: "پتوس سبز و سرحال برای زیباتر کردن فضای خانه",
        price: 890000,
        stock: 40,
        images: [
          "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=85",
        ],
        categoryId: plants.id,
        attributes: { plant: "پتوس", care: "آسان", placement: "فضای داخلی" },
      },
    ],
  });

  // Create admin user
  const hashedPassword = await require("bcryptjs").hash("admin123", 12);
  await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      phone: "0912000000",
      role: "ADMIN",
    },
  });

  console.log("Database seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
