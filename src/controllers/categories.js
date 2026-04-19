const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create category
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: description || null,
        parentId: parentId || null,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

// Get all categories with pagination and nested structure
exports.getCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, parentId } = req.query;
    const skip = (page - 1) * limit;

    const where = parentId ? { parentId } : { parentId: null };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          parent: true,
          children: true,
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.category.count({ where }),
    ]);

    res.json({
      data: categories,
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

// Get category by ID with products
exports.getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            discountPrice: true,
            stock: true,
            images: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    next(error);
  }
};

// Update category
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, parentId } = req.body;

    // Check if category exists
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Prevent setting itself as parent
    if (parentId === id) {
      return res.status(400).json({ error: 'Category cannot be its own parent' });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name || category.name,
        description: description !== undefined ? description : category.description,
        parentId: parentId !== undefined ? parentId : category.parentId,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Delete category (with cascade delete of children or reassign products)
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: { products: true, children: true },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Option: reassign products to parent category or null
    if (category.products.length > 0) {
      await prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: category.parentId },
      });
    }

    // Delete the category
    await prisma.category.delete({ where: { id } });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get category tree (all categories with nested structure)
exports.getCategoryTree = async (req, res, next) => {
  try {
    const rootCategories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(rootCategories);
  } catch (error) {
    next(error);
  }
};
