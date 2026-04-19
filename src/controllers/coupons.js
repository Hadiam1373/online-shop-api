const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create coupon (admin only)
exports.createCoupon = async (req, res, next) => {
  try {
    const { code, discountType, discountValue, expirationDate, usageLimit } = req.body;

    // Validation
    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ error: 'Code, discountType, and discountValue are required' });
    }

    if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
      return res.status(400).json({ error: 'Invalid discount type' });
    }

    if (discountType === 'PERCENTAGE' && (discountValue < 0 || discountValue > 100)) {
      return res.status(400).json({ error: 'Percentage discount must be between 0 and 100' });
    }

    // Check if coupon code already exists
    const existing = await prisma.coupon.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue,
        expirationDate: expirationDate ? new Date(expirationDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: usageLimit || 100,
        usedCount: 0,
      },
    });

    res.status(201).json(coupon);
  } catch (error) {
    next(error);
  }
};

// Get all coupons
exports.getCoupons = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status === 'active') {
      where.expirationDate = { gte: new Date() };
      where.usedCount = { lt: prisma.coupon.fields.usageLimit };
    } else if (status === 'expired') {
      where.expirationDate = { lt: new Date() };
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.coupon.count({ where }),
    ]);

    res.json({
      data: coupons,
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

// Get coupon by code
exports.getCouponByCode = async (req, res, next) => {
  try {
    const { code } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json(coupon);
  } catch (error) {
    next(error);
  }
};

// Validate coupon
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Coupon not found' 
      });
    }

    const now = new Date();

    // Check if expired
    if (coupon.expirationDate < now) {
      return res.json({ 
        valid: false, 
        error: 'Coupon has expired' 
      });
    }

    // Check if usage limit reached
    if (coupon.usedCount >= coupon.usageLimit) {
      return res.json({ 
        valid: false, 
        error: 'Coupon usage limit exceeded' 
      });
    }

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update coupon (admin only)
exports.updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { discountValue, expirationDate, usageLimit } = req.body;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        discountValue: discountValue !== undefined ? discountValue : coupon.discountValue,
        expirationDate: expirationDate ? new Date(expirationDate) : coupon.expirationDate,
        usageLimit: usageLimit !== undefined ? usageLimit : coupon.usageLimit,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Delete coupon (admin only)
exports.deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    await prisma.coupon.delete({ where: { id } });

    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get coupon statistics (admin only)
exports.getCouponStats = async (req, res, next) => {
  try {
    const now = new Date();

    const [totalCoupons, activeCoupons, expiredCoupons, mostUsed] = await Promise.all([
      prisma.coupon.count(),
      prisma.coupon.count({
        where: {
          expirationDate: { gte: now },
        },
      }),
      prisma.coupon.count({
        where: {
          expirationDate: { lt: now },
        },
      }),
      prisma.coupon.findMany({
        orderBy: { usedCount: 'desc' },
        take: 5,
      }),
    ]);

    res.json({
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      mostUsedCoupons: mostUsed.map(c => ({
        code: c.code,
        usedCount: c.usedCount,
        usageLimit: c.usageLimit,
      })),
    });
  } catch (error) {
    next(error);
  }
};
