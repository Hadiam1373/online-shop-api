const { PrismaClient } = require("@prisma/client");

(async function () {
  const prisma = new PrismaClient();
  try {
    const order = await prisma.order.findFirst({
      include: { orderItems: true },
    });
    if (!order) return console.log("No orders found");
    if (order.orderItems && order.orderItems.length > 0)
      return console.log("Order already has items");

    const product = await prisma.product.findFirst();
    if (!product) return console.log("No product found to attach");

    // Create order item
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        quantity: 2,
        price: product.discountPrice || product.price,
      },
    });
    console.log("Created orderItem:", orderItem.id);

    // Optionally update order total
    const subtotal =
      (product.discountPrice || product.price) * orderItem.quantity;
    const tax = subtotal * 0.1;
    const newTotal = subtotal + tax;
    await prisma.order.update({
      where: { id: order.id },
      data: { total: newTotal },
    });
    console.log("Updated order total to", newTotal);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
