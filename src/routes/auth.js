const express = require("express");
const Joi = require("joi");
const validate = require("../middlewares/validation");
const {
  register,
  login,
  requestOtp,
  verifyOtp,
  completeRegistration,
  refreshToken,
} = require("../controllers/auth");

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  phone: Joi.string().required(),
  email: Joi.string().email(),
  password: Joi.string().min(6),
  address: Joi.string(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const requestOtpSchema = Joi.object({
  phone: Joi.string().required(),
});

const verifyOtpSchema = Joi.object({
  phone: Joi.string().required(),
  code: Joi.string().length(6).required(),
});

const completeRegistrationSchema = Joi.object({
  phone: Joi.string().required(),
  email: Joi.string().email(),
  password: Joi.string().min(6),
  address: Joi.string(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// Routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

// OTP-based authentication (Phone)
router.post("/request-otp", validate(requestOtpSchema), requestOtp);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);
router.post(
  "/complete-registration",
  validate(completeRegistrationSchema),
  completeRegistration,
);

router.post("/refresh", validate(refreshSchema), refreshToken);

module.exports = router;
