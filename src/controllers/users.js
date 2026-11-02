const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

// Get current user profile
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { orders: true, reviews: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      email,
      firstName,
      lastName,
      province,
      city,
      address,
      postalCode,
      deliveryNotes,
    } = req.body;

    // Check if email is already taken
    if (email?.trim()) {
      const existing = await prisma.user.findUnique({
        where: { email: email.trim() },
      });

      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    const nullableValue = (value) =>
      value === undefined ? undefined : value.trim() || null;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        email: email === undefined ? undefined : email.trim() || null,
        firstName: nullableValue(firstName),
        lastName: nullableValue(lastName),
        province: nullableValue(province),
        city: nullableValue(city),
        address: nullableValue(address),
        postalCode: nullableValue(postalCode),
        deliveryNotes: nullableValue(deliveryNotes),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        province: true,
        city: true,
        address: true,
        postalCode: true,
        deliveryNotes: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { orders: true, reviews: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Change password
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ error: "All password fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

// Get user's order history
exports.getOrderHistory = async (req, res, next) => {
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
            include: {
              product: { select: { id: true, name: true, images: true } },
            },
          },
          payment: true,
        },
        orderBy: { createdAt: "desc" },
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

// Get user's reviews
exports.getMyReviews = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { userId },
        skip,
        take: parseInt(limit),
        include: {
          product: { select: { id: true, name: true, images: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.count({ where: { userId } }),
    ]);

    res.json({
      data: reviews,
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

// Get user's wishlist/favorites (if you add this to schema)
exports.getFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // This endpoint would require a Favorite/Wishlist model
    // For now, return a message
    res.json({
      message: "Wishlist feature requires additional schema setup",
      userId,
    });
  } catch (error) {
    next(error);
  }
};

// Add product to wishlist (if you add this to schema)
exports.addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    // This endpoint would require a Favorite/Wishlist model
    res.json({
      message: "Wishlist feature requires additional schema setup",
      userId,
      productId,
    });
  } catch (error) {
    next(error);
  }
};

// Get user statistics
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [totalOrders, totalSpent, averageOrderValue, totalReviews] =
      await Promise.all([
        prisma.order.count({ where: { userId } }),
        prisma.order.aggregate({
          _sum: { total: true },
          where: { userId },
        }),
        prisma.order.aggregate({
          _avg: { total: true },
          where: { userId },
        }),
        prisma.review.count({ where: { userId } }),
      ]);

    const latestOrder = await prisma.order.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, status: true },
    });

    res.json({
      totalOrders,
      totalSpent: totalSpent._sum.total || 0,
      averageOrderValue: (averageOrderValue._avg.total || 0).toFixed(2),
      totalReviews,
      lastOrderDate: latestOrder?.createdAt || null,
      lastOrderStatus: latestOrder?.status || null,
    });
  } catch (error) {
    next(error);
  }
};

// Delete user account (soft delete)
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ error: "Password is required to delete account" });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Password is incorrect" });
    }

    // Delete user (this will cascade delete dependent records or soft delete)
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    next(error);
  }
};
