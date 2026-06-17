require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || "12");

  // 1) User (ensure via upsert on phone to avoid unique constraint errors)
  const hashed = await bcrypt.hash("admin123", SALT_ROUNDS);
  let user = await prisma.user.upsert({
    where: { phone: "0912000000" },
    update: {
      email: "admin@example.com",
      password: hashed,
      address: "Tehran, Iran",
      role: "ADMIN",
    },
    create: {
      email: "admin@example.com",
      password: hashed,
      phone: "0912000000",
      address: "Tehran, Iran",
      role: "ADMIN",
    },
  });
  console.log("Ensured admin user:", user.email || user.phone);

  // 2) OTP
  let otp = await prisma.otpCode.findFirst({ where: { phone: user.phone } });
  if (!otp) {
    otp = await prisma.otpCode.create({
      data: {
        phone: user.phone,
        code: "123456",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        userId: user.id,
      },
    });
    console.log("Created OTP for", user.phone);
  }

  // 3) Refresh token
  let rt = await prisma.refreshToken.findFirst({ where: { userId: user.id } });
  if (!rt) {
    rt = await prisma.refreshToken.create({
      data: {
        token: "refresh_token_example",
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("Created refresh token");
  }

  // 4) Category
  let category = await prisma.category.findFirst({
    where: { name: "Electronics" },
  });
  if (!category) {
    category = await prisma.category.create({
      data: { name: "Electronics", description: "Electronic devices" },
    });
    console.log("Created category Electronics");
  }

  // 5) Product
  let product = await prisma.product.findFirst({
    where: { name: "Smartphone" },
  });
  if (!product) {
    product = await prisma.product.create({
      data: {
        name: "Smartphone",
        description: "Latest model",
        price: 699.99,
        discountPrice: 649.99,
        stock: 50,
        images: ["https://example.com/smartphone.jpg"],
        categoryId: category.id,
        attributes: { color: "Black", storage: "128GB" },
      },
    });
    console.log("Created product Smartphone");
  }

  // 6) Coupon
  let coupon = await prisma.coupon
    .findUnique({ where: { code: "SUMMER10" } })
    .catch(() => null);
  if (!coupon) {
    coupon = await prisma.coupon.create({
      data: {
        code: "SUMMER10",
        discountType: "PERCENTAGE",
        discountValue: 10.0,
        expirationDate: new Date("2026-09-01T00:00:00.000Z"),
        usageLimit: 100,
      },
    });
    console.log("Created coupon SUMMER10");
  }

  // 7) Review
  let review = await prisma.review.findFirst({
    where: { userId: user.id, productId: product.id },
  });
  if (!review) {
    review = await prisma.review.create({
      data: {
        userId: user.id,
        productId: product.id,
        rating: 5,
        comment: "Great phone!",
      },
    });
    console.log("Created review");
  }

  // 8) Cart & CartItem
  let cart = await prisma.cart.findFirst({ where: { userId: user.id } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId: user.id } });
    console.log("Created cart");
  }

  let cartItem = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId: product.id },
  });
  if (!cartItem) {
    cartItem = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
        price: product.discountPrice || product.price,
      },
    });
    console.log("Created cart item");
  }

  // 9) Order, OrderItem, Payment
  let existingOrder = await prisma.order.findFirst({
    where: { userId: user.id },
  });
  if (!existingOrder) {
    const subtotal = (product.discountPrice || product.price) * 2;
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        total,
        status: "PENDING",
        orderItems: {
          create: [
            {
              productId: product.id,
              quantity: 2,
              price: product.discountPrice || product.price,
            },
          ],
        },
      },
      include: { orderItems: true },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: total,
        status: "SUCCESS",
        transactionId: "txn_123456",
      },
    });
    console.log("Created order and payment");
  } else {
    console.log("Order already exists for user");
  }

  // 10) Additional sample orders
  const orderStatuses = ["PENDING", "PAID", "SHIPPED", "DELIVERED"];
  for (let i = 0; i < 3; i++) {
    const existsOrder = await prisma.order.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000 * (i + 1)),
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000 * i),
        },
      },
    });

    if (!existsOrder) {
      const quantity = Math.floor(Math.random() * 3) + 1;
      const basePrice = product.discountPrice || product.price;
      const subtotal = basePrice * quantity;
      const discount = i % 2 === 0 ? subtotal * 0.05 : 0;
      const tax = (subtotal - discount) * 0.1;
      const total = subtotal - discount + tax;

      const sampleOrder = await prisma.order.create({
        data: {
          userId: user.id,
          total,
          status: orderStatuses[i % orderStatuses.length],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * (i + 1)),
          orderItems: {
            create: [
              {
                productId: product.id,
                quantity,
                price: basePrice,
              },
            ],
          },
        },
      });

      await prisma.payment.create({
        data: {
          orderId: sampleOrder.id,
          amount: total,
          status: i % 2 === 0 ? "SUCCESS" : "FAILURE",
          transactionId: `txn_sample_${i + 1}`,
        },
      });
    }
  }
  console.log("Created sample orders");

  // 11) Wishlist
  let existingWishlist = await prisma.wishlist.findFirst({
    where: { userId: user.id, productId: product.id },
  });
  if (!existingWishlist) {
    await prisma.wishlist.create({
      data: {
        userId: user.id,
        productId: product.id,
      },
    });
    console.log("Added product to wishlist");
  } else {
    console.log("Product already in wishlist");
  }

  // Add more products to wishlist
  let product2 = await prisma.product.findFirst({
    where: { name: { contains: "Laptop" } },
  });
  if (!product2) {
    product2 = await prisma.product.create({
      data: {
        name: "Laptop",
        description: "High-performance laptop",
        price: 1299.99,
        discountPrice: 1199.99,
        stock: 30,
        images: ["https://example.com/laptop.jpg"],
        categoryId: category.id,
        attributes: { brand: "Dell", storage: "512GB SSD" },
      },
    });
  }

  let wishlistItem2 = await prisma.wishlist.findFirst({
    where: { userId: user.id, productId: product2.id },
  });
  if (!wishlistItem2) {
    await prisma.wishlist.create({
      data: {
        userId: user.id,
        productId: product2.id,
      },
    });
    console.log("Added Laptop to wishlist");
  }

  // Add product 3 - Tablet
  let product3 = await prisma.product.findFirst({
    where: { name: "Tablet" },
  });
  if (!product3) {
    product3 = await prisma.product.create({
      data: {
        name: "Tablet",
        description: "10-inch high-resolution tablet",
        price: 499.99,
        discountPrice: 449.99,
        stock: 45,
        images: ["https://example.com/tablet.jpg"],
        categoryId: category.id,
        attributes: { brand: "Apple", screenSize: "10-inch" },
      },
    });
  }

  let wishlistItem3 = await prisma.wishlist.findFirst({
    where: { userId: user.id, productId: product3.id },
  });
  if (!wishlistItem3) {
    await prisma.wishlist.create({
      data: {
        userId: user.id,
        productId: product3.id,
      },
    });
    console.log("Added Tablet to wishlist");
  }

  // Add product 4 - Wireless Headphones
  let product4 = await prisma.product.findFirst({
    where: { name: "Wireless Headphones" },
  });
  if (!product4) {
    product4 = await prisma.product.create({
      data: {
        name: "Wireless Headphones",
        description: "Noise-cancelling Bluetooth headphones",
        price: 199.99,
        discountPrice: 179.99,
        stock: 100,
        images: ["https://example.com/headphones.jpg"],
        categoryId: category.id,
        attributes: { brand: "Sony", batteryLife: "30 hours" },
      },
    });
  }

  let wishlistItem4 = await prisma.wishlist.findFirst({
    where: { userId: user.id, productId: product4.id },
  });
  if (!wishlistItem4) {
    await prisma.wishlist.create({
      data: {
        userId: user.id,
        productId: product4.id,
      },
    });
    console.log("Added Wireless Headphones to wishlist");
  }

  // Add product 5 - USB-C Cable
  let product5 = await prisma.product.findFirst({
    where: { name: "USB-C Cable" },
  });
  if (!product5) {
    product5 = await prisma.product.create({
      data: {
        name: "USB-C Cable",
        description: "Fast charging USB-C cable (2m)",
        price: 19.99,
        discountPrice: 14.99,
        stock: 500,
        images: ["https://example.com/usb-cable.jpg"],
        categoryId: category.id,
        attributes: { length: "2m", maxPower: "100W" },
      },
    });
  }

  let wishlistItem5 = await prisma.wishlist.findFirst({
    where: { userId: user.id, productId: product5.id },
  });
  if (!wishlistItem5) {
    await prisma.wishlist.create({
      data: {
        userId: user.id,
        productId: product5.id,
      },
    });
    console.log("Added USB-C Cable to wishlist");
  }

  // Add product 6 - Monitor
  let product6 = await prisma.product.findFirst({
    where: { name: "4K Monitor" },
  });
  if (!product6) {
    product6 = await prisma.product.create({
      data: {
        name: "4K Monitor",
        description: "27-inch 4K UHD display",
        price: 399.99,
        discountPrice: 349.99,
        stock: 20,
        images: ["https://example.com/monitor.jpg"],
        categoryId: category.id,
        attributes: { resolution: "4K UHD", refreshRate: "60Hz" },
      },
    });
  }

  let wishlistItem6 = await prisma.wishlist.findFirst({
    where: { userId: user.id, productId: product6.id },
  });
  if (!wishlistItem6) {
    await prisma.wishlist.create({
      data: {
        userId: user.id,
        productId: product6.id,
      },
    });
    console.log("Added 4K Monitor to wishlist");
  }

  console.log("Seeding complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
