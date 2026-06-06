const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get user's wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const wishlistItems = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            discountPrice: true,
            stock: true,
            images: true,
            categoryId: true,
            attributes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.wishlist.count({ where: { userId } });

    res.json({
      data: wishlistItems.map((item) => ({
        id: item.id,
        product: item.product,
        addedAt: item.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Add product to wishlist
exports.addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findFirst({
      where: { userId, productId },
    });

    if (existing) {
      return res.status(409).json({ message: "Product already in wishlist" });
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlist.create({
      data: { userId, productId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            discountPrice: true,
            stock: true,
            images: true,
            categoryId: true,
            attributes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    res.status(201).json({
      message: "Product added to wishlist",
      data: wishlistItem,
    });
  } catch (error) {
    next(error);
  }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const wishlistItem = await prisma.wishlist.findFirst({
      where: { userId, productId },
    });

    if (!wishlistItem) {
      return res.status(404).json({ message: "Product not in wishlist" });
    }

    await prisma.wishlist.delete({
      where: { id: wishlistItem.id },
    });

    res.json({ message: "Product removed from wishlist" });
  } catch (error) {
    next(error);
  }
};

// Check if product is in wishlist
exports.isInWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.query;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const wishlistItem = await prisma.wishlist.findFirst({
      where: { userId, productId },
    });

    res.json({
      isInWishlist: !!wishlistItem,
      productId,
    });
  } catch (error) {
    next(error);
  }
};

// Clear entire wishlist
exports.clearWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const deletedCount = await prisma.wishlist.deleteMany({
      where: { userId },
    });

    res.json({
      message: "Wishlist cleared",
      deletedCount: deletedCount.count,
    });
  } catch (error) {
    next(error);
  }
};
