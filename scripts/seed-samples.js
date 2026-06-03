require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || "12");

  // 1) User
  let user = await prisma.user
    .findUnique({ where: { email: "admin@example.com" } })
    .catch(() => null);
  if (!user) {
    const hashed = await bcrypt.hash("admin123", SALT_ROUNDS);
    user = await prisma.user.create({
      data: {
        email: "admin@example.com",
        password: hashed,
        phone: "0912000000",
        address: "Tehran, Iran",
        role: "ADMIN",
      },
    });
    console.log("Created user", user.email);
  } else {
    console.log("User exists:", user.email);
  }

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
