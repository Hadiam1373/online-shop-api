const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const normalizeCart = (cart) => ({
  ...cart,
  cartItems: cart.cartItems.map((item) => ({
    ...item,
    cartItemId: item.id,
    itemId: item.id,
  })),
});

const calculateCartSummary = (cart) => {
  const subtotal = cart.cartItems.reduce((sum, item) => {
    const price = item.product.discountPrice || item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const itemCount = cart.cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return { subtotal, total: subtotal, itemCount };
};

// Helper: load cart with items and product details for a user
const loadCartForUser = async (userId) => {
  let cart = await prisma.cart.findFirst({
    where: { userId },
    include: {
      cartItems: {
        orderBy: { id: "asc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              discountPrice: true,
              images: true,
              stock: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        cartItems: {
          orderBy: { id: "asc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                discountPrice: true,
                images: true,
                stock: true,
              },
            },
          },
        },
      },
    });
  }

  return normalizeCart(cart);
};
// Get user's cart
exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        cartItems: {
          orderBy: { id: "asc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                discountPrice: true,
                images: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      // Create empty cart if doesn't exist
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          cartItems: {
            orderBy: { id: "asc" },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  discountPrice: true,
                  images: true,
                  stock: true,
                },
              },
            },
          },
        },
      });
    }

    const normalizedCart = normalizeCart(cart);
    const { subtotal, total, itemCount } = calculateCartSummary(normalizedCart);

    res.json({
      cart: normalizedCart,
      subtotal,
      total,
      itemCount,
    });
  } catch (error) {
    next(error);
  }
};

// Add product to cart
exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res
        .status(400)
        .json({ error: "Product ID and quantity are required" });
    }

    // Check if product exists and has stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    // Get or create cart
    let cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    // Check if product already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    let cartItem;
    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        return res
          .status(400)
          .json({ error: "Insufficient stock for requested quantity" });
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: { product: true },
      });
    } else {
      // Add new item
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          price: product.discountPrice || product.price,
        },
        include: { product: true },
      });
    }

    // Return full cart so client sees up-to-date IDs and totals
    cart = await loadCartForUser(userId);
    const normalizedCart = normalizeCart(cart);
    const { subtotal, total, itemCount } = calculateCartSummary(normalizedCart);

    res.status(201).json({
      message: "Product added to cart",
      cart: normalizedCart,
      subtotal,
      total,
      itemCount,
    });
  } catch (error) {
    next(error);
  }
};

// Update cart item quantity
exports.updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({ error: "Valid quantity is required" });
    }

    // Get cart item and verify it belongs to user
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true, product: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    // Check stock
    if (quantity > 0 && cartItem.product.stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    if (quantity === 0) {
      // Delete item if quantity is 0
      await prisma.cartItem.delete({ where: { id: cartItemId } });

      const cart = await loadCartForUser(userId);
      const { subtotal, total, itemCount } = calculateCartSummary(cart);

      return res.json({
        cart,
        subtotal,
        total,
        itemCount,
      });
    }

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    const cart = await loadCartForUser(userId);
    const { subtotal, total, itemCount } = calculateCartSummary(cart);

    res.json({
      cart,
      subtotal,
      total,
      itemCount,
    });
  } catch (error) {
    next(error);
  }
};

// Increment cart item quantity by 1
exports.incrementCartItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true, product: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    // Check stock
    if (cartItem.product.stock <= cartItem.quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: cartItem.quantity + 1 },
    });

    const cart = await loadCartForUser(userId);
    const { subtotal, total, itemCount } = calculateCartSummary(cart);

    res.json({
      cart,
      subtotal,
      total,
      itemCount,
    });
  } catch (error) {
    next(error);
  }
};

// Decrement cart item quantity by 1 (remove if quantity becomes 0)
exports.decrementCartItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true, product: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    const newQuantity = cartItem.quantity - 1;
    if (newQuantity <= 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId } });

      const cart = await loadCartForUser(userId);
      const { subtotal, total, itemCount } = calculateCartSummary(cart);

      return res.json({
        cart,
        subtotal,
        total,
        itemCount,
      });
    }

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: newQuantity },
    });

    const cart = await loadCartForUser(userId);
    const { subtotal, total, itemCount } = calculateCartSummary(cart);

    res.json({
      cart,
      subtotal,
      total,
      itemCount,
    });
  } catch (error) {
    next(error);
  }
};

exports.changeCartItemQuantityByType = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cartItemId, type } = req.params;

    if (!["increment", "decrement"].includes(type)) {
      return res.status(400).json({ error: "Invalid cart action" });
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true, product: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    if (type === "increment") {
      if (cartItem.product.stock <= cartItem.quantity) {
        return res.status(400).json({ error: "Insufficient stock" });
      }

      await prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity: cartItem.quantity + 1 },
      });
    } else {
      const newQuantity = cartItem.quantity - 1;
      if (newQuantity <= 0) {
        await prisma.cartItem.delete({ where: { id: cartItemId } });
      } else {
        await prisma.cartItem.update({
          where: { id: cartItemId },
          data: { quantity: newQuantity },
        });
      }
    }

    const cart = await loadCartForUser(userId);
    const { subtotal, total, itemCount } = calculateCartSummary(cart);

    res.json({
      cart,
      subtotal,
      total,
      itemCount,
    });
  } catch (error) {
    next(error);
  }
};

// Remove product from cart
exports.removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    // Verify cart item belongs to user
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    await prisma.cartItem.delete({ where: { id: cartItemId } });

    res.json({ message: "Product removed from cart" });
  } catch (error) {
    next(error);
  }
};

// Clear cart
exports.clearCart = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return res.json({ message: "Cart cleared" });
  } catch (error) {
    next(error);
  }
};

// Calculate cart totals with coupon support
exports.calculateTotal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { couponCode } = req.body;

    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        cartItems: {
          orderBy: { id: "asc" },
          include: { product: true },
        },
      },
    });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    let subtotal = 0;
    let discount = 0;
    let tax = 0;

    // Calculate subtotal
    cart.cartItems.forEach((item) => {
      const price = item.product.discountPrice || item.product.price;
      subtotal += price * item.quantity;
    });

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (coupon) {
        const now = new Date();
        if (
          coupon.expirationDate &&
          coupon.expirationDate >= now &&
          coupon.usedCount < coupon.usageLimit
        ) {
          if (coupon.discountType === "PERCENTAGE") {
            discount = (subtotal * coupon.discountValue) / 100;
          } else {
            discount = coupon.discountValue;
          }
        }
      }
    }

    // Calculate tax (assuming 10%)
    tax = (subtotal - discount) * 0.1;

    const total = subtotal - discount + tax;

    res.json({
      subtotal,
      discount,
      tax,
      total,
      itemCount: cart.cartItems.length,
    });
  } catch (error) {
    next(error);
  }
};
