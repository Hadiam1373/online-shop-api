const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Mock payment processing
const processPayment = (amount, cardToken) => {
  // Simulate payment success rate of 95%
  const isSuccess = Math.random() < 0.95;

  return {
    success: isSuccess,
    transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    message: isSuccess ? "Payment processed successfully" : "Payment declined",
  };
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

    // Process payment with mock gateway
    const paymentResult = processPayment(order.total, cardToken);

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
