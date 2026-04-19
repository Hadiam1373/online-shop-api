const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create review
exports.createReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, rating, comment } = req.body;

    // Validation
    if (!productId || !rating) {
      return res.status(400).json({ error: 'Product ID and rating are required' });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user already reviewed this product
    const existing = await prisma.review.findFirst({
      where: { userId, productId },
    });

    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    // Check if user has purchased this product (optional - for now allow all users)
    // You can add order verification here if needed

    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        comment: comment || null,
        moderated: false, // Reviews need moderation by default
      },
      include: {
        user: { select: { id: true, email: true } },
        product: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};

// Get reviews for a product
exports.getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, moderated } = req.query;
    const skip = (page - 1) * limit;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const where = { productId };
    // Only show moderated reviews to non-admin users
    if (req.user?.role !== 'ADMIN') {
      where.moderated = true;
    } else if (moderated !== undefined) {
      where.moderated = moderated === 'true';
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where }),
    ]);

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    res.json({
      data: reviews,
      product: {
        id: product.id,
        name: product.name,
        averageRating: avgRating,
        totalReviews: total,
      },
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
exports.getUserReviews = async (req, res, next) => {
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
        orderBy: { createdAt: 'desc' },
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

// Get review by ID
exports.getReviewById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        product: { select: { id: true, name: true } },
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    next(error);
  }
};

// Update review
exports.updateReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        rating: rating !== undefined ? rating : review.rating,
        comment: comment !== undefined ? comment : review.comment,
        moderated: false, // Reset moderation when updated
      },
      include: {
        user: { select: { id: true, email: true } },
        product: { select: { id: true, name: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Delete review
exports.deleteReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.review.delete({ where: { id } });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Moderate review (admin only)
exports.moderateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approve } = req.body;

    if (typeof approve !== 'boolean') {
      return res.status(400).json({ error: 'Approve field (boolean) is required' });
    }

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { moderated: approve },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Get pending reviews (admin only)
exports.getPendingReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { moderated: false },
        skip,
        take: parseInt(limit),
        include: {
          user: { select: { id: true, email: true } },
          product: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.review.count({ where: { moderated: false } }),
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

// Get review statistics
exports.getReviewStats = async (req, res, next) => {
  try {
    const [totalReviews, moderatedReviews, pendingReviews, averageRating] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { moderated: true } }),
      prisma.review.count({ where: { moderated: false } }),
      prisma.review.aggregate({
        _avg: { rating: true },
      }),
    ]);

    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      _count: true,
      where: { moderated: true },
    });

    const distribution = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = 0;
    }
    ratingDistribution.forEach(item => {
      distribution[item.rating] = item._count;
    });

    res.json({
      totalReviews,
      moderatedReviews,
      pendingReviews,
      averageRating: (averageRating._avg.rating || 0).toFixed(1),
      ratingDistribution: distribution,
    });
  } catch (error) {
    next(error);
  }
};
