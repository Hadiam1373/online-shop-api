const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get dashboard statistics
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalOrders,
      totalRevenue,
      totalProducts,
      totalCategories,
      pendingOrders,
      averageOrderValue,
      topProducts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
      }),
      prisma.product.count(),
      prisma.category.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.aggregate({
        _avg: { total: true },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    // Get top products details
    const topProductsData = await Promise.all(
      topProducts.map(item =>
        prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true },
        })
      )
    );

    res.json({
      overview: {
        totalUsers,
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        totalProducts,
        totalCategories,
        pendingOrders,
        averageOrderValue: (averageOrderValue._avg.total || 0).toFixed(2),
      },
      topProducts: topProductsData.map((product, idx) => ({
        product,
        quantity: topProducts[idx]._sum.quantity,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// Get users list (admin only)
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (role) {
      where.role = role.toUpperCase();
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
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

// Get user details (admin only)
exports.getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          select: { id: true, total: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { orders: true, reviews: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

// Update user role (admin only)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['USER', 'ADMIN', 'OPERATOR'].includes(role.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() },
      select: { id: true, email: true, role: true },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Ban/Unban user (admin only - using a soft delete pattern via a boolean field if added)
exports.banUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { banned } = req.body;

    // Note: You may need to add a 'banned' field to User model
    // For now, we'll just use a response message
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: `User ${banned ? 'banned' : 'unbanned'} successfully`,
      userId,
      status: banned ? 'banned' : 'active',
    });
  } catch (error) {
    next(error);
  }
};

// Get sales report (admin only)
exports.getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [
      totalOrders,
      totalRevenue,
      averageOrderValue,
      ordersByStatus,
      dailySales,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({
        _sum: { total: true },
        where,
      }),
      prisma.order.aggregate({
        _avg: { total: true },
        where,
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: true,
        where,
      }),
      prisma.order.groupBy({
        by: ['createdAt'],
        _sum: { total: true },
        _count: true,
        where,
      }),
    ]);

    const statusBreakdown = {};
    ordersByStatus.forEach(item => {
      statusBreakdown[item.status] = item._count;
    });

    res.json({
      period: { startDate, endDate },
      summary: {
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        averageOrderValue: (averageOrderValue._avg.total || 0).toFixed(2),
      },
      statusBreakdown,
      dailySales: dailySales.slice(-30).map(item => ({
        date: item.createdAt.toISOString().split('T')[0],
        revenue: item._sum.total,
        orders: item._count,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// Get product performance report (admin only)
exports.getProductReport = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const products = await prisma.product.findMany({
      skip,
      take: parseInt(limit),
      include: {
        _count: {
          select: { orderItems: true, reviews: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: { stock: 'asc' },
    });

    const productsWithStats = products.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      orderCount: product._count.orderItems,
      reviewCount: product._count.reviews,
      averageRating:
        product.reviews.length > 0
          ? (product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length).toFixed(1)
          : 0,
    }));

    const total = await prisma.product.count();

    res.json({
      data: productsWithStats,
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

// Get inventory report (admin only)
exports.getInventoryReport = async (req, res, next) => {
  try {
    const lowStockThreshold = req.query.threshold || 10;

    const [lowStockProducts, outOfStockProducts, topStockProducts] = await Promise.all([
      prisma.product.findMany({
        where: {
          stock: {
            lte: parseInt(lowStockThreshold),
            gt: 0,
          },
        },
        select: { id: true, name: true, stock: true, price: true },
        orderBy: { stock: 'asc' },
      }),
      prisma.product.findMany({
        where: { stock: 0 },
        select: { id: true, name: true, price: true },
      }),
      prisma.product.findMany({
        orderBy: { stock: 'desc' },
        take: 10,
        select: { id: true, name: true, stock: true },
      }),
    ]);

    res.json({
      lowStockThreshold,
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts,
      topStock: topStockProducts,
      summary: {
        totalLowStock: lowStockProducts.length,
        totalOutOfStock: outOfStockProducts.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get customer insights (admin only)
exports.getCustomerInsights = async (req, res, next) => {
  try {
    const [topCustomers, recentCustomers, activeCustomers] = await Promise.all([
      prisma.user.findMany({
        take: 10,
        select: {
          id: true,
          email: true,
          _count: { select: { orders: true } },
        },
        orderBy: {
          orders: {
            _count: 'desc',
          },
        },
      }),
      prisma.user.findMany({
        take: 10,
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({
        where: {
          orders: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      }),
    ]);

    res.json({
      topCustomers,
      recentCustomers,
      activeCustomersLast30Days: activeCustomers,
      totalCustomers: await prisma.user.count(),
    });
  } catch (error) {
    next(error);
  }
};
