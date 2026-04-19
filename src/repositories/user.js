const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const createUser = async (data) => {
  return prisma.user.create({ data });
};

const findUserByEmail = async (email) => {
  return prisma.user.findUnique({ where: { email } });
};

const findUserById = async (id) => {
  return prisma.user.findUnique({ where: { id } });
};

const updateUser = async (id, data) => {
  return prisma.user.update({ where: { id }, data });
};

const deleteUser = async (id) => {
  return prisma.user.delete({ where: { id } });
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  deleteUser,
};
