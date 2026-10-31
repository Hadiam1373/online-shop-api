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
    where: { name: "دسته‌گل و گل‌آرایی" },
  });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "دسته‌گل و گل‌آرایی",
        description: "دسته‌گل‌های تازه برای هدیه و مناسبت‌های خاص",
      },
    });
    console.log("Created category دسته‌گل و گل‌آرایی");
  }

  let plantsCategory = await prisma.category.findFirst({
    where: { name: "گیاهان آپارتمانی" },
  });
  if (!plantsCategory) {
    plantsCategory = await prisma.category.create({
      data: {
        name: "گیاهان آپارتمانی",
        description: "گیاهان سبز برای خانه و محل کار",
      },
    });
    console.log("Created category گیاهان آپارتمانی");
  }

  // 5) Product
  let product = await prisma.product.findFirst({
    where: { name: "دسته‌گل رز صورتی" },
  });
  if (!product) {
    product = await prisma.product.create({
      data: {
        name: "دسته‌گل رز صورتی",
        description: "دسته‌گلی دست‌ساز از رزهای صورتی برای تولد و سالگرد",
        price: 1890000,
        discountPrice: 1690000,
        stock: 20,
        images: [
          "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=85",
        ],
        categoryId: category.id,
        attributes: {
          flower: "رز هلندی",
          color: "صورتی",
          occasion: "تولد و سالگرد",
        },
      },
    });
    console.log("Created product دسته‌گل رز صورتی");
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
        comment: "دسته‌گل تازه و بسیار زیبایی بود.",
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
    where: { name: "باکس گل بهاری" },
  });
  if (!product2) {
    product2 = await prisma.product.create({
      data: {
        name: "باکس گل بهاری",
        description: "ترکیبی رنگارنگ از گل‌های فصلی در باکس هدیه",
        price: 2490000,
        discountPrice: 2290000,
        stock: 18,
        images: [
          "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=85",
        ],
        categoryId: category.id,
        attributes: {
          flowers: "رز و ژربرا",
          color: "ترکیبی",
          occasion: "هدیه",
        },
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
    console.log("Added باکس گل بهاری to wishlist");
  }

  // Add product 3 - Sunflower bouquet
  let product3 = await prisma.product.findFirst({
    where: { name: "دسته‌گل آفتابگردان" },
  });
  if (!product3) {
    product3 = await prisma.product.create({
      data: {
        name: "دسته‌گل آفتابگردان",
        description: "ترکیبی پرانرژی از آفتابگردان‌های تازه برای هدیه دادن",
        price: 1250000,
        discountPrice: 1150000,
        stock: 30,
        images: [
          "https://images.unsplash.com/photo-1597848212624-e6e8d9f3f5b5?auto=format&fit=crop&w=900&q=85",
        ],
        categoryId: category.id,
        attributes: {
          flower: "آفتابگردان",
          color: "زرد",
          occasion: "تبریک و تشکر",
        },
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
    console.log("Added دسته‌گل آفتابگردان to wishlist");
  }

  // Add product 4 - Indoor plant
  let product4 = await prisma.product.findFirst({
    where: { name: "گیاه آپارتمانی پتوس" },
  });
  if (!product4) {
    product4 = await prisma.product.create({
      data: {
        name: "گیاه آپارتمانی پتوس",
        description: "پتوس سبز و سرحال برای زیباتر کردن فضای خانه",
        price: 890000,
        discountPrice: 790000,
        stock: 40,
        images: [
          "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=85",
        ],
        categoryId: plantsCategory.id,
        attributes: { plant: "پتوس", care: "آسان", placement: "فضای داخلی" },
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
    console.log("Added گیاه آپارتمانی پتوس to wishlist");
  }

  // Add product 5 - Tulip bouquet
  let product5 = await prisma.product.findFirst({
    where: { name: "دسته‌گل لاله" },
  });
  if (!product5) {
    product5 = await prisma.product.create({
      data: {
        name: "دسته‌گل لاله",
        description: "لاله‌های رنگارنگ و تازه برای هدیه‌ای بهاری",
        price: 1390000,
        discountPrice: 1290000,
        stock: 35,
        images: [
          "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=900&q=85",
        ],
        categoryId: category.id,
        attributes: { flower: "لاله", color: "ترکیبی", occasion: "بهار" },
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
    console.log("Added دسته‌گل لاله to wishlist");
  }

  // Add product 6 - Monitor
  let product6 = await prisma.product.findFirst({
    where: { name: "ارکیده‌ی سفید" },
  });
  if (!product6) {
    product6 = await prisma.product.create({
      data: {
        name: "ارکیده‌ی سفید",
        description: "ارکیده‌ی سفید و ظریف برای خانه یا هدیه‌ی رسمی",
        price: 1990000,
        discountPrice: 1890000,
        stock: 16,
        images: [
          "https://images.unsplash.com/photo-1566943384924-2e6a3d8f6c30?auto=format&fit=crop&w=900&q=85",
        ],
        categoryId: category.id,
        attributes: {
          flower: "ارکیده",
          color: "سفید",
          placement: "فضای داخلی",
        },
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
    console.log("Added ارکیده‌ی سفید to wishlist");
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
