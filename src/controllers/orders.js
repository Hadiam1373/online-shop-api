const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const normalizeDigits = (value) => {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = persianDigits.indexOf(digit);
    return String(persianIndex === -1 ? arabicDigits.indexOf(digit) : persianIndex);
  });
};

// Create order from cart
exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      couponCode,
      firstName,
      lastName,
      province,
      city,
      address,
      postalCode,
      deliveryNotes,
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's cart
    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        cartItems: {
          include: { product: true },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const unavailableItem = cart.cartItems.find(
      (item) => item.product.stock < item.quantity,
    );
    if (unavailableItem) {
      return res.status(409).json({
        error: `Insufficient stock for ${unavailableItem.product.name}`,
      });
    }

    // Calculate total
    let subtotal = 0;
    let discount = 0;
    const orderItems = [];

    for (const item of cart.cartItems) {
      const price = item.product.discountPrice ?? item.product.price;
      subtotal += price * item.quantity;

      orderItems.push({
        productId: item.product.id,
        quantity: item.quantity,
        price,
      });

      // Update product stock
      await prisma.product.update({
        where: { id: item.product.id },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (coupon) {
        const now = new Date();
        if (
          coupon.expirationDate >= now &&
          (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit)
        ) {
          if (coupon.discountType === 'PERCENTAGE') {
            discount = (subtotal * coupon.discountValue) / 100;
          } else {
            discount = coupon.discountValue;
          }
          // Increment coupon usage
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    }

    const tax = ((subtotal - discount) * 0.1);
    const total = subtotal - discount + tax;

    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        total,
        status: 'PENDING',
        recipientFirstName: firstName,
        recipientLastName: lastName,
        recipientPhone: user.phone,
        province,
        city,
        address,
        postalCode: normalizeDigits(postalCode),
        deliveryNotes: deliveryNotes || null,
        orderItems: {
          create: orderItems,
        },
      },
      include: {
        orderItems: {
          include: { product: true },
        },
      },
    });

    res.status(201).json({
      order,
      calculation: {
        subtotal,
        discount,
        tax,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get user's orders
exports.getOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          orderItems: {
            include: { product: true },
          },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      data: orders,
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

// Get order by ID
exports.getOrderById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { product: true },
        },
        payment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user owns this order or is admin
    if (order.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

// Update order status (admin only)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: status.toUpperCase() },
      include: {
        orderItems: { include: { product: true } },
        payment: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Cancel order
exports.cancelOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (['SHIPPED', 'DELIVERED'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot cancel shipped or delivered order' });
    }

    // Restore product stock
    for (const item of order.orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Get all orders (admin only)
exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) {
      where.status = status.toUpperCase();
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: { select: { id: true, email: true } },
          orderItems: {
            include: { product: true },
          },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      data: orders,
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

// Get order statistics (admin only)
exports.getOrderStats = async (req, res, next) => {
  try {
    const [totalOrders, totalRevenue, pendingOrders, ordersByStatus] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
      }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const statusBreakdown = {};
    ordersByStatus.forEach((item) => {
      statusBreakdown[item.status] = item._count;
    });

    res.json({
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      pendingOrders,
      statusBreakdown,
    });
  } catch (error) {
    next(error);
  }
};
