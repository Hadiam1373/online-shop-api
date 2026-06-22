const { PrismaClient } = require("@prisma/client");
let Stripe = null;
try {
  Stripe = require("stripe");
} catch (e) {
  // stripe may be optional in some environments (dev/test); fall back gracefully
  Stripe = null;
}
const fetch = require("node-fetch");
const prisma = new PrismaClient();
const stripe = process.env.STRIPE_SECRET_KEY && Stripe
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const ZARINPAL_MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID;
const ZARINPAL_SANDBOX = process.env.ZARINPAL_SANDBOX !== "false";
const ZARINPAL_BASE_URL = ZARINPAL_SANDBOX
  ? "https://sandbox.zarinpal.com"
  : "https://www.zarinpal.com";

const getZarinpalCallbackUrl = (orderId) => {
  const callback = process.env.ZARINPAL_CALLBACK_URL;
  if (callback) {
    return callback.includes("?")
      ? `${callback}&orderId=${encodeURIComponent(orderId)}`
      : `${callback}?orderId=${encodeURIComponent(orderId)}`;
  }

  const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${apiUrl}/api/payments/zarinpal/callback?orderId=${encodeURIComponent(orderId)}`;
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

const requestZarinpalPayment = async (order) => {
  if (!ZARINPAL_MERCHANT_ID) {
    throw new Error("Zarinpal merchant ID is not configured");
  }

  if (ZARINPAL_MERCHANT_ID === "00000000-0000-0000-0000-000000000000") {
    throw new Error(
      "Zarinpal merchant ID is not set. Please configure a valid Merchant ID from https://www.zarinpal.com"
    );
  }

  const callbackURL = getZarinpalCallbackUrl(order.id);
  const amount = Math.round(order.total);

  try {
    const response = await fetch(
      `${ZARINPAL_BASE_URL}/pg/rest/WebGate/PaymentRequest.json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          MerchantID: ZARINPAL_MERCHANT_ID,
          Amount: amount,
          CallbackURL: callbackURL,
          Description: `پرداخت سفارش ${order.id}`,
          Metadata: { orderId: order.id },
        }),
      }
    );

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error(
        `Zarinpal API returned invalid response. Status: ${response.status}. Check your Merchant ID and network connection. Response: ${text.substring(0, 200)}`
      );
    }
    return result;
  } catch (error) {
    throw error;
  }
};

const verifyZarinpalPayment = async (authority, amount) => {
  if (!ZARINPAL_MERCHANT_ID) {
    throw new Error("Zarinpal merchant ID is not configured");
  }

  try {
    const response = await fetch(
      `${ZARINPAL_BASE_URL}/pg/rest/WebGate/PaymentVerification.json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          MerchantID: ZARINPAL_MERCHANT_ID,
          Authority: authority,
          Amount: amount,
        }),
      }
    );

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error(
        `Zarinpal verification API returned invalid response. Status: ${response.status}. Response: ${text.substring(0, 200)}`
      );
    }
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

    if (order.payment) {
      return res.status(400).json({ error: "Payment already exists for this order" });
    }

    const zarinpalResult = await requestZarinpalPayment(order);
    if (zarinpalResult.Status !== 100) {
      return res.status(400).json({
        error: "Zarinpal request failed",
        details: zarinpalResult,
      });
    }

    const paymentUrl = `${ZARINPAL_BASE_URL}/pg/StartPay/${zarinpalResult.Authority}`;
    res.json({ paymentUrl, authority: zarinpalResult.Authority });
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

    if (order.payment) {
      return res.status(400).json({ error: "Payment already exists for this order" });
    }

    const zarinpalResult = await requestZarinpalPayment(order);
    if (zarinpalResult.Status !== 100) {
      return res.status(400).json({
        error: "Zarinpal request failed",
        details: zarinpalResult,
      });
    }

    const paymentUrl = `${ZARINPAL_BASE_URL}/pg/StartPay/${zarinpalResult.Authority}`;
    return res.redirect(paymentUrl);
  } catch (error) {
    next(error);
  }
};

exports.verifyZarinpalPayment = async (req, res, next) => {
  try {
    const { Authority, Status, orderId } = req.query;

    if (!Authority || !Status || !orderId) {
      return res.status(400).send(`
        <html><body><h1>پرداخت ناموفق</h1><p>پارامترهای لازم ارسال نشده‌اند.</p></body></html>
      `);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      return res.status(404).send(`
        <html><body><h1>پرداخت ناموفق</h1><p>سفارش پیدا نشد.</p></body></html>
      `);
    }

    if (Status !== "OK") {
      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            status: "FAILURE",
            transactionId: Authority,
          },
        });
      } else {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: order.total,
            status: "FAILURE",
            transactionId: Authority,
          },
        });
      }

      return res.send(`
        <html><body><h1>پرداخت ناموفق</h1><p>وضعیت پرداخت: ${Status}</p></body></html>
      `);
    }

    const verification = await verifyZarinpalPayment(Authority, Math.round(order.total));
    let payment;

    if (verification.Status === 100 || verification.Status === 101) {
      if (order.payment) {
        payment = await prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            status: "SUCCESS",
            transactionId: Authority,
          },
        });
      } else {
        payment = await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: order.total,
            status: "SUCCESS",
            transactionId: Authority,
          },
        });
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });

      return res.send(`
        <html><body><h1>پرداخت موفق</h1><p>سفارش شما با موفقیت پرداخت شد.</p><p>کد Authority: ${Authority}</p></body></html>
      `);
    }

    if (order.payment) {
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: "FAILURE",
          transactionId: Authority,
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: order.total,
          status: "FAILURE",
          transactionId: Authority,
        },
      });
    }

    return res.send(`
      <html><body><h1>پرداخت ناموفق</h1><p>وضعیت بازگشتی: ${verification.Status}</p><p>پیغام: ${verification.Message || verification.Status}</p></body></html>
    `);
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
