const { PrismaClient } = require("@prisma/client");

(async function () {
  const prisma = new PrismaClient();
  try {
    const orders = await prisma.order.findMany({
      include: { orderItems: true },
    });
    console.log(JSON.stringify(orders, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
