// Auth services - business logic for authentication

const { PrismaClient } = require("@prisma/client");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateOtp, getOtpExpiry } = require("../utils/otp");

const prisma = new PrismaClient();

// Check if user exists by email
const userExists = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  return !!user;
};

// Get user by email
const getUserByEmail = async (email) => {
  return prisma.user.findUnique({ where: { email } });
};

// Check if phone exists
const phoneExists = async (phone) => {
  const user = await prisma.user.findFirst({
    where: { phone },
  });
  return !!user;
};

// Get user by phone
const getUserByPhone = async (phone) => {
  return prisma.user.findFirst({
    where: { phone },
  });
};

// Request OTP for phone number
const requestOtp = async (phone) => {
  try {
    let user = await getUserByPhone(phone);

    if (!user) {
      // Create new user with phone
      user = await prisma.user.create({
        data: { phone },
      });
    }

    // Generate OTP
    const otp = generateOtp(6);
    const expiresAt = getOtpExpiry(5); // 5 minutes expiry

    // Store OTP in database
    await prisma.otpCode.create({
      data: {
        phone,
        code: otp,
        expiresAt,
        userId: user.id,
      },
    });

    return {
      success: true,
      message: "OTP sent successfully",
      otp, // In production, this should be sent via SMS/Twilio
    };
  } catch (error) {
    throw error;
  }
};

// Verify OTP and authenticate user
const verifyOtp = async (phone, code) => {
  try {
    const user = await getUserByPhone(phone);
    if (!user) {
      throw new Error("User not found");
    }

    // Find valid OTP
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone,
        userId: user.id,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      throw new Error("OTP expired or not found");
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      throw new Error("Too many attempts. Please request a new OTP");
    }

    // Verify OTP
    if (otpRecord.code !== code) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      throw new Error("Invalid OTP");
    }

    // Delete used OTP
    await prisma.otpCode.delete({
      where: { id: otpRecord.id },
    });

    return {
      success: true,
      user,
      message: "OTP verified successfully",
    };
  } catch (error) {
    throw error;
  }
};

// Create user with phone, email and address
const createUserWithPhone = async (phone, email, address) => {
  try {
    const user = await prisma.user.update({
      where: { phone },
      data: {
        email,
        address,
      },
    });
    return user;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  userExists,
  getUserByEmail,
  phoneExists,
  getUserByPhone,
  requestOtp,
  verifyOtp,
  createUserWithPhone,
};
