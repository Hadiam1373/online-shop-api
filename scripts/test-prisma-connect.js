require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
(async () => {
  const p = new PrismaClient();
  try {
    await p.$connect();
    console.log("PRISMA_OK");
    await p.$disconnect();
  } catch (e) {
    console.error("PRISMA_ERR");
    console.error(e.message);
    console.error(e);
    process.exitCode = 1;
  }
})();
