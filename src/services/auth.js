// Auth services - business logic for authentication

const { PrismaClient } = require("@prisma/client");
const { hashPassword, comparePassword } = require("../utils/password");

const prisma = new PrismaClient();

// Example: Check if user exists
const userExists = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  return !!user;
};

// Example: Get user by email
const getUserByEmail = async (email) => {
  return prisma.user.findUnique({ where: { email } });
};

module.exports = {
  userExists,
  getUserByEmail,
};
