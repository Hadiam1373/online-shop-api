const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      categoryId,
      minPrice,
      maxPrice,
      search,
      availability,
      hasDiscount,
      sort,
    } = req.query;

    const pageNumber = Number.parseInt(page, 10);
    const limitNumber = Number.parseInt(limit, 10);
    const currentPage =
      Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const take =
      Number.isFinite(limitNumber) && limitNumber > 0
        ? Math.min(limitNumber, 100)
        : 10;
    const skip = (currentPage - 1) * take;

    const andConditions = [];

    if (categoryId) {
      andConditions.push({ categoryId });
    }

    if (minPrice || maxPrice) {
      const priceCondition = {};
      if (minPrice) priceCondition.gte = parseFloat(minPrice);
      if (maxPrice) priceCondition.lte = parseFloat(maxPrice);
      andConditions.push({ price: priceCondition });
    }

    if (hasDiscount === "true" || hasDiscount === "1") {
      andConditions.push({ discountPrice: { not: null } });
    }

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (availability === "in_stock") {
      andConditions.push({ stock: { gt: 0 } });
    } else if (availability === "out_of_stock") {
      andConditions.push({ stock: { equals: 0 } });
    }

    const where =
      andConditions.length > 0
        ? andConditions.length === 1
          ? andConditions[0]
          : { AND: andConditions }
        : {};

    let orderBy = { createdAt: "desc" };
    switch (sort) {
      case "price_asc":
        orderBy = { price: "asc" };
        break;
      case "price_desc":
        orderBy = { price: "desc" };
        break;
      case "name_asc":
        orderBy = { name: "asc" };
        break;
      case "name_desc":
        orderBy = { name: "desc" };
        break;
      case "stock_asc":
        orderBy = { stock: "asc" };
        break;
      case "stock_desc":
        orderBy = { stock: "desc" };
        break;
      case "discount_asc":
        orderBy = { discountPrice: "asc" };
        break;
      case "discount_desc":
        orderBy = { discountPrice: "desc" };
        break;
      case "createdAt_asc":
        orderBy = { createdAt: "asc" };
        break;
      case "createdAt_desc":
      default:
        orderBy = { createdAt: "desc" };
    }

    const products = await prisma.product.findMany({
      where,
      skip,
      take,
      include: { category: true },
      orderBy,
    });

    const total = await prisma.product.count({ where });

    res.json({
      products,
      pagination: {
        page: currentPage,
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, reviews: true },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: req.body.categoryId },
    });
    if (!category) {
      return res
        .status(400)
        .json({ message: "Invalid categoryId: Category does not exist" });
    }

    const product = await prisma.product.create({
      data: req.body,
      include: { category: true },
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.update({
      where: { id },
      data: req.body,
      include: { category: true },
    });

    res.json(product);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({ where: { id } });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
