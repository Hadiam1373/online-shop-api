const { PrismaClient } = require("@prisma/client");
const { hashPassword, comparePassword } = require("../utils/password");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");
const {
  userExists,
  getUserByEmail,
  phoneExists,
  getUserByPhone,
  requestOtp: requestOtpService,
  verifyOtp: verifyOtpService,
  createUserWithPhone,
} = require("../services/auth");

const prisma = new PrismaClient();

// Traditional email + password registration (optional)
const register = async (req, res, next) => {
  try {
    const { email, password, phone, address } = req.body;

    // Check if phone already exists
    if (await phoneExists(phone)) {
      return res
        .status(409)
        .json({ message: "Phone number already registered" });
    }

    // Check if email already exists (if provided)
    if (email && (await userExists(email))) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = password ? await hashPassword(password) : null;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        phone,
        address,
      },
    });

    const accessToken = generateAccessToken({
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({ id: user.id });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      message: "User registered successfully",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login with email and password (legacy support)
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken({
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({ id: user.id });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Request OTP for phone-based login
const requestOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    const result = await requestOtpService(phone);

    // In production, send OTP via SMS/Twilio
    // For now, we return it in response for testing
    res.status(200).json({
      message: "OTP sent to your phone",
      phone,
      otp: result.otp, // Remove in production
    });
  } catch (error) {
    next(error);
  }
};

// Verify OTP and login
const verifyOtp = async (req, res, next) => {
  try {
    const { phone, code } = req.body;

    const result = await verifyOtpService(phone, code);
    const user = result.user;

    const accessToken = generateAccessToken({
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({ id: user.id });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Complete registration after OTP verification
const completeRegistration = async (req, res, next) => {
  try {
    const { phone, email, address, password } = req.body;

    const user = await getUserByPhone(phone);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = password ? await hashPassword(password) : null;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        address,
        password: hashedPassword,
      },
    });

    res.json({
      message: "Registration completed successfully",
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        email: updatedUser.email,
        address: updatedUser.address,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    const decoded = verifyRefreshToken(token);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    const newAccessToken = generateAccessToken({
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: "Access token refreshed",
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

// Request OTP specifically for password reset (phone)
const requestPasswordReset = async (req, res, next) => {
  try {
    const { phone } = req.body;

    const result = await requestOtpService(phone);

    // In production, OTP should be sent via SMS and not returned
    res.status(200).json({
      message: "OTP sent for password reset",
      phone,
      otp: result.otp,
    });
  } catch (error) {
    next(error);
  }
};

// Verify OTP and set new password
const resetPassword = async (req, res, next) => {
  try {
    const { phone, code, newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Password fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Verify OTP
    const result = await verifyOtpService(phone, code);
    const user = result.user;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  requestOtp,
  requestPasswordReset,
  verifyOtp,
  resetPassword,
  completeRegistration,
  refreshToken,
};
