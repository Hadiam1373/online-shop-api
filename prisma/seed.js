const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Create categories
  const electronics = await prisma.category.create({
    data: {
      name: "Electronics",
      description: "Electronic devices and gadgets",
    },
  });

  const clothing = await prisma.category.create({
    data: {
      name: "Clothing",
      description: "Fashion and apparel",
    },
  });

  // Create products
  await prisma.product.createMany({
    data: [
      {
        name: "Smartphone",
        description: "Latest smartphone with advanced features",
        price: 699.99,
        discountPrice: 649.99,
        stock: 50,
        images: ["https://example.com/smartphone.jpg"],
        categoryId: electronics.id,
        attributes: { color: "Black", storage: "128GB" },
      },
      {
        name: "Laptop",
        description: "High-performance laptop for work and gaming",
        price: 1299.99,
        stock: 30,
        images: ["https://example.com/laptop.jpg"],
        categoryId: electronics.id,
        attributes: { color: "Silver", ram: "16GB" },
      },
      {
        name: "T-Shirt",
        description: "Comfortable cotton t-shirt",
        price: 19.99,
        stock: 100,
        images: ["https://example.com/tshirt.jpg"],
        categoryId: clothing.id,
        attributes: { size: "M", color: "Blue" },
      },
    ],
  });

  // Create admin user
  const hashedPassword = await require("bcryptjs").hash("admin123", 12);
  await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
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
