const { PrismaClient } = require("@prisma/client");
let Stripe = null;
try {
  Stripe = require("stripe");
} catch (e) {
  // stripe may be optional in some environments (dev/test); fall back gracefully
  Stripe = null;
}
const ZarinpalCheckout = require("zarinpal-checkout");
const prisma = new PrismaClient();
const stripe =
  process.env.STRIPE_SECRET_KEY && Stripe
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

// Initialize Zarinpal
const ZARINPAL_MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID;
const ZARINPAL_SANDBOX = process.env.ZARINPAL_SANDBOX !== "false";
const zarinpal = ZARINPAL_MERCHANT_ID
  ? ZarinpalCheckout.create(ZARINPAL_MERCHANT_ID, ZARINPAL_SANDBOX)
  : null;

const getZarinpalCallbackUrl = (orderId) => {
  const callback =
    process.env.ZARINPAL_CALLBACK_URL ||
    `http://localhost:${process.env.PORT || 5000}/api/payments/zarinpal/callback`;
  const callbackUrl = new URL(callback);
  callbackUrl.searchParams.set("orderId", orderId);
  return callbackUrl.toString();
};

const processMockPayment = (amount, cardToken) => {
  const isSuccess = Math.random() < 0.95;

  return {
    success: isSuccess,
    transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    message: isSuccess ? "Payment processed successfully" : "Payment declined",
  };
};

const processStripePayment = async (amount, cardToken, orderId) => {
  try {
    const charge = await stripe.charges.create({
      amount: Math.round(amount * 100),
      currency: process.env.STRIPE_CURRENCY || "usd",
      source: cardToken,
      description: `Order ${orderId}`,
      metadata: { orderId },
    });

    return {
      success: charge.status === "succeeded",
      transactionId: charge.id,
      message: charge.outcome?.seller_message || charge.status,
      raw: charge,
    };
  } catch (error) {
    return {
      success: false,
      transactionId: error.code || null,
      message: error.message,
      error,
    };
  }
};

const requestZarinpalPayment = async (order, user) => {
  if (!zarinpal) {
    // If Zarinpal is not configured, use mock payment
    return {
      status: 100,
      authority: `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      url: "https://sandbox.zarinpal.com/pg/StartPay/mock",
    };
  }

  const amount = Math.round(order.total);

  if (amount < 1000) {
    console.warn(
      `Amount ${amount} is less than minimum 1000. Using mock payment.`,
    );
    return {
      status: 100,
      authority: `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      url: "https://sandbox.zarinpal.com/pg/StartPay/mock",
    };
  }

  const result = await zarinpal.PaymentRequest({
    Amount: amount,
    CallbackURL: getZarinpalCallbackUrl(order.id),
    Description: `سفارش #${order.id}`,
    Email: user.email,
    Mobile: user.phone,
  });

  if (result.status !== 100) {
    throw new Error(`Zarinpal error: ${result.error}`);
  }

  return result;
};

const savePendingPayment = (orderId, amount, authority) =>
  prisma.payment.upsert({
    where: { orderId },
    update: {
      amount,
      status: "PENDING",
      transactionId: authority,
    },
    create: {
      orderId,
      amount,
      status: "PENDING",
      transactionId: authority,
    },
  });

const normalizeCallbackKey = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const getCallbackParameter = (req, ...aliases) => {
  const expectedKeys = new Set(aliases.map(normalizeCallbackKey));
  const sources = [req.query, req.body];

  if (req.originalUrl) {
    try {
      const requestUrl = new URL(
        req.originalUrl,
        `http://${req.get("host") || "localhost"}`,
      );
      sources.push(Object.fromEntries(requestUrl.searchParams.entries()));
    } catch (error) {
      console.warn("Could not parse Zarinpal callback URL:", error.message);
    }
  }

  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    for (const [key, value] of Object.entries(source)) {
      if (expectedKeys.has(normalizeCallbackKey(key)) && typeof value === "string") {
        return value.trim();
      }
    }
  }

  return "";
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const getStorefrontUrl = (path) => {
  const configuredOrigin =
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:3000";

  try {
    return new URL(path, configuredOrigin).toString();
  } catch (error) {
    console.error("Invalid storefront URL for payment callback:", error.message);
    return new URL(path, "http://localhost:3000").toString();
  }
};

const renderPaymentResult = ({
  success,
  title,
  description,
  returnPath,
  trackingCode,
  buttonLabel,
}) => {
  const returnUrl = getStorefrontUrl(returnPath);
  const safeTrackingCode = trackingCode ? escapeHtml(trackingCode) : "";
  const accent = success ? "#24724b" : "#b64f58";
  const softAccent = success ? "#e8f4ec" : "#fff0ef";
  const icon = success
    ? '<path d="m8 16 4 4 8-8"/><circle cx="12" cy="12" r="10"/>'
    : '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/>';

  return `<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f7f8f2">
    <meta http-equiv="refresh" content="6;url=${escapeHtml(returnUrl)}">
    <title>${escapeHtml(title)} | گل‌نوش</title>
    <style>
      :root { color-scheme: light; font-family: "Anjoman", "HarmonyOS Sans", Tahoma, sans-serif; }
      * { box-sizing: border-box; }
      body {
        min-height: 100vh; margin: 0; padding: 28px;
        display: grid; place-items: center; color: #293d32;
        background:
          radial-gradient(ellipse at 12% 18%, #e8efdf 0, transparent 34%),
          radial-gradient(ellipse at 90% 86%, #f5eadd 0, transparent 30%), #f7f8f2;
      }
      .card {
        position: relative; width: min(100%, 520px); overflow: hidden;
        padding: 42px 38px 34px; text-align: center; border: 1px solid #e8eadf;
        border-radius: 28px; background: rgba(255,255,255,.94);
        box-shadow: 0 24px 70px rgba(48, 73, 52, .12);
      }
      .card::before, .card::after {
        position: absolute; width: 150px; height: 150px; border-radius: 50%;
        background: ${softAccent}; content: ""; opacity: .7;
      }
      .card::before { top: -94px; right: -72px; }
      .card::after { bottom: -112px; left: -72px; }
      .brand { position: relative; z-index: 1; color: #39734d; font-size: 15px; font-weight: 700; }
      .icon {
        position: relative; z-index: 1; display: grid; width: 82px; height: 82px;
        margin: 30px auto 22px; place-items: center; border-radius: 26px;
        color: ${accent}; background: ${softAccent};
      }
      .icon svg { width: 38px; height: 38px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
      h1 { position: relative; z-index: 1; margin: 0; font-size: clamp(23px, 5vw, 29px); }
      .description { position: relative; z-index: 1; margin: 13px 0 0; color: #68756c; font-size: 15px; line-height: 2; }
      .tracking {
        position: relative; z-index: 1; margin: 24px 0 0; padding: 12px;
        border: 1px dashed #dfe5dc; border-radius: 14px; color: #53665a;
        font-size: 13px; overflow-wrap: anywhere;
      }
      .button {
        position: relative; z-index: 1; display: inline-flex; min-height: 50px;
        align-items: center; justify-content: center; margin-top: 28px; padding: 0 25px;
        border-radius: 15px; color: white; background: #39734d; text-decoration: none;
        font-size: 15px; font-weight: 700; transition: background .2s, transform .2s;
      }
      .button:hover { background: #2e603f; transform: translateY(-1px); }
      .hint { position: relative; z-index: 1; margin: 13px 0 0; color: #89928a; font-size: 12px; }
      @media (max-width: 480px) { body { padding: 16px; } .card { padding: 34px 22px 28px; } }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="brand">گل‌نوش <span aria-hidden="true">✿</span></div>
      <div class="icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icon}</svg></div>
      <h1>${escapeHtml(title)}</h1>
      <p class="description">${escapeHtml(description)}</p>
      ${safeTrackingCode ? `<p class="tracking">کد پیگیری: <bdi>${safeTrackingCode}</bdi></p>` : ""}
      <a class="button" href="${escapeHtml(returnUrl)}">${escapeHtml(buttonLabel || (success ? "بازگشت به فروشگاه" : "بازگشت به سبد خرید و تلاش دوباره"))}</a>
      <p class="hint">تا چند ثانیهٔ دیگر به صفحهٔ مربوطه منتقل می‌شوید.</p>
    </main>
  </body>
</html>`;
};

const releaseFailedOrderReservation = async (orderId, authority) =>
  prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, payment: true },
    });

    if (!order) return false;

    const cancelled = await transaction.order.updateMany({
      where: { id: orderId, status: { in: ["PENDING", "PAID"] } },
      data: { status: "CANCELLED" },
    });

    if (cancelled.count === 0) return false;

    if (order.payment) {
      await transaction.payment.update({
        where: { id: order.payment.id },
        data: {
          status: "FAILURE",
          transactionId: authority || order.payment.transactionId,
        },
      });
    } else {
      await transaction.payment.create({
        data: {
          orderId,
          amount: order.total,
          status: "FAILURE",
          transactionId: authority || null,
        },
      });
    }

    let cart = await transaction.cart.findUnique({
      where: { userId: order.userId },
    });
    if (!cart) {
      cart = await transaction.cart.create({
        data: { userId: order.userId },
      });
    }

    for (const item of order.orderItems) {
      await transaction.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });

      const cartItem = await transaction.cartItem.findFirst({
        where: { cartId: cart.id, productId: item.productId },
      });

      if (!cartItem) {
        await transaction.cartItem.create({
          data: {
            cartId: cart.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          },
        });
      }
    }

    return true;
  });

const finalizeSuccessfulOrder = async (orderId, authority) =>
  prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, payment: true },
    });

    if (!order) {
      throw new Error(`Order ${orderId} was not found while finalizing payment`);
    }

    if (order.status === "PAID" && order.payment?.status === "SUCCESS") {
      return;
    }

    await transaction.payment.upsert({
      where: { orderId },
      update: {
        status: "SUCCESS",
        transactionId: authority,
      },
      create: {
        orderId,
        amount: order.total,
        status: "SUCCESS",
        transactionId: authority,
      },
    });

    await transaction.order.update({
      where: { id: orderId },
      data: { status: "PAID" },
    });

    const cart = await transaction.cart.findUnique({
      where: { userId: order.userId },
    });
    if (!cart) return;

    for (const item of order.orderItems) {
      const cartItem = await transaction.cartItem.findFirst({
        where: { cartId: cart.id, productId: item.productId },
      });

      if (!cartItem) continue;

      if (cartItem.quantity <= item.quantity) {
        await transaction.cartItem.delete({ where: { id: cartItem.id } });
      } else {
        await transaction.cartItem.update({
          where: { id: cartItem.id },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }
  });

const verifyZarinpalPayment = async (authority, amount) => {
  if (!zarinpal) {
    throw new Error("Zarinpal is not configured");
  }

  try {
    const result = await zarinpal.PaymentVerification({
      Amount: Math.round(amount),
      Authority: authority,
    });

    return result;
  } catch (error) {
    throw error;
  }
};

// Process payment for an order
exports.processPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderId, cardToken, cardLast4 } = req.body;

    if (!orderId || !cardToken) {
      return res
        .status(400)
        .json({ error: "Order ID and card token are required" });
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.userId !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId },
    });

    if (existingPayment) {
      return res
        .status(400)
        .json({ error: "Payment already processed for this order" });
    }

    const paymentResult = stripe
      ? await processStripePayment(order.total, cardToken, order.id)
      : processMockPayment(order.total, cardToken);

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount: order.total,
        status: paymentResult.success ? "SUCCESS" : "FAILURE",
        transactionId: paymentResult.transactionId,
      },
    });

    // Update order status if payment successful
    if (paymentResult.success) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      });
    }

    res.status(201).json({
      payment,
      order: {
        id: orderId,
        status: paymentResult.success ? "PAID" : "PENDING",
      },
      result: paymentResult,
    });
  } catch (error) {
    next(error);
  }
};

exports.createZarinpalPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.userId !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (order.status === "PAID" || order.payment?.status === "SUCCESS") {
      return res
        .status(400)
        .json({ error: "Payment already exists for this order" });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: order.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const zarinpalResult = await requestZarinpalPayment(order, user);
    const payment = await savePendingPayment(
      orderId,
      order.total,
      zarinpalResult.authority,
    );

    res.json({
      success: true,
      paymentUrl: zarinpalResult.url,
      authority: zarinpalResult.authority,
      payment,
    });
  } catch (error) {
    next(error);
  }
};

exports.startZarinpalPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.userId !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (order.status === "PAID" || order.payment?.status === "SUCCESS") {
      return res
        .status(400)
        .json({ error: "Payment already exists for this order" });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: order.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const zarinpalResult = await requestZarinpalPayment(order, user);
    await savePendingPayment(
      order.id,
      order.total,
      zarinpalResult.authority,
    );
    return res.redirect(zarinpalResult.url);
  } catch (error) {
    next(error);
  }
};

exports.verifyZarinpalPayment = async (req, res, next) => {
  try {
    const authority = getCallbackParameter(req, "Authority", "authority");
    const status = getCallbackParameter(req, "Status", "status").toUpperCase();
    const orderId = getCallbackParameter(req, "orderId", "order_id");

    if (!authority) {
      console.warn("Zarinpal callback did not include an authority.", {
        queryKeys: Object.keys(req.query || {}),
        bodyKeys: Object.keys(req.body || {}),
      });
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.status(400).send(
        renderPaymentResult({
          success: false,
          title: "نتیجه پرداخت دریافت نشد",
          description:
            "اطلاعات لازم از درگاه به فروشگاه نرسید. اگر مبلغی از حساب شما کسر شده، پیش از پرداخت دوباره با پشتیبانی تماس بگیرید.",
          returnPath: "/user-dashboard/orders",
          buttonLabel: "پیگیری سفارش",
        }),
      );
    }

    let order = orderId
      ? await prisma.order.findUnique({
          where: { id: orderId },
          include: { payment: true },
        })
      : null;

    if (!order) {
      const payment = await prisma.payment.findFirst({
        where: { transactionId: authority },
        include: { order: { include: { payment: true } } },
      });
      order = payment?.order || null;
    }

    if (!order) {
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.status(404).send(
        renderPaymentResult({
          success: false,
          title: "سفارش پیدا نشد",
          description:
            "سفارش مرتبط با این پرداخت پیدا نشد. اگر مبلغی کسر شده، برای پیگیری با پشتیبانی تماس بگیرید.",
          returnPath: "/user-dashboard/orders",
          buttonLabel: "رفتن به سفارش‌های من",
        }),
      );
    }

    if (
      order.payment?.transactionId &&
      order.payment.transactionId !== authority
    ) {
      console.warn("Zarinpal callback authority does not match the order payment.", {
        orderId: order.id,
      });
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.status(400).send(
        renderPaymentResult({
          success: false,
          title: "پرداخت نیاز به پیگیری دارد",
          description:
            "شناسه پرداخت با سفارش مطابقت ندارد. لطفاً از پرداخت دوباره خودداری کنید و سفارش را پیگیری کنید.",
          returnPath: "/user-dashboard/orders",
          buttonLabel: "رفتن به سفارش‌های من",
        }),
      );
    }

    if (status && status !== "OK") {
      await releaseFailedOrderReservation(order.id, authority);
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(
        renderPaymentResult({
          success: false,
          title: "پرداخت انجام نشد",
          description:
            "پرداخت در درگاه تکمیل نشد. کالاهای سفارش به سبد خرید شما بازگشتند تا بتوانید دوباره تلاش کنید.",
          returnPath: "/cart/checkout",
        }),
      );
    }

    if (order.status === "PAID" && order.payment?.status === "SUCCESS") {
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(
        renderPaymentResult({
          success: true,
          title: "پرداخت شما پیش‌تر تأیید شده است",
          description: "سفارش شما با موفقیت ثبت شده است. از خریدتان سپاسگزاریم.",
          returnPath: "/products",
          trackingCode: authority,
        }),
      );
    }

    let verification;
    try {
      verification = await verifyZarinpalPayment(
        authority,
        Math.round(order.total),
      );
    } catch (error) {
      console.error("Could not verify Zarinpal payment:", error);
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.status(503).send(
        renderPaymentResult({
          success: false,
          title: "نتیجه پرداخت در حال بررسی است",
          description:
            "در حال حاضر ارتباط با درگاه برقرار نشد. برای جلوگیری از پرداخت تکراری، وضعیت سفارش خود را بررسی کنید.",
          returnPath: "/user-dashboard/orders",
          buttonLabel: "پیگیری سفارش",
        }),
      );
    }

    if (verification.status === 100 || verification.status === 101) {
      await finalizeSuccessfulOrder(order.id, authority);

      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(
        renderPaymentResult({
          success: true,
          title: "پرداخت با موفقیت انجام شد",
          description: "سفارش شما ثبت شد و به‌زودی برای آماده‌سازی آن اقدام می‌کنیم.",
          returnPath: "/products",
          trackingCode: authority,
        }),
      );
    }

    await releaseFailedOrderReservation(order.id, authority);
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.send(
      renderPaymentResult({
        success: false,
        title: "پرداخت ناموفق بود",
        description:
          "پرداخت توسط درگاه تأیید نشد. کالاها به سبد خرید شما بازگشتند تا بتوانید دوباره تلاش کنید.",
        returnPath: "/cart/checkout",
      }),
    );
  } catch (error) {
    next(error);
  }
};

// Get payment details
exports.getPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Check authorization
    if (payment.order.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
};

// Get payment for order
exports.getPaymentByOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!payment) {
      return res
        .status(404)
        .json({ error: "Payment not found for this order" });
    }

    // Check authorization
    if (payment.order.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
};

// Get all payments (admin only)
exports.getAllPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) {
      where.status = status.toUpperCase();
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          order: {
            include: { user: { select: { id: true, email: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      data: payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get payment statistics (admin only)
exports.getPaymentStats = async (req, res, next) => {
  try {
    const [totalPayments, successfulPayments, failedPayments, totalAmount] =
      await Promise.all([
        prisma.payment.count(),
        prisma.payment.count({ where: { status: "SUCCESS" } }),
        prisma.payment.count({ where: { status: "FAILURE" } }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: "SUCCESS" },
        }),
      ]);

    res.json({
      totalPayments,
      successfulPayments,
      failedPayments,
      successRate:
        totalPayments > 0
          ? ((successfulPayments / totalPayments) * 100).toFixed(2) + "%"
          : "0%",
      totalAmount: totalAmount._sum.amount || 0,
    });
  } catch (error) {
    next(error);
  }
};

// Refund payment (admin only)
exports.refundPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status === "REFUNDED") {
      return res.status(400).json({ error: "Payment already refunded" });
    }

    if (payment.status !== "SUCCESS") {
      return res
        .status(400)
        .json({ error: "Only successful payments can be refunded" });
    }

    // Update payment status
    const refunded = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED" },
    });

    // Update order status back to PENDING
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "CANCELLED" },
    });

    res.json({
      message: "Payment refunded successfully",
      payment: refunded,
    });
  } catch (error) {
    next(error);
  }
};
