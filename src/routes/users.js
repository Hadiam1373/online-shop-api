const express = require("express");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validation");
const Joi = require("joi");
const userController = require("../controllers/users");

const router = express.Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  email: Joi.string().email().optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required(),
});

const deleteAccountSchema = Joi.object({
  password: Joi.string().required(),
});

// All user routes require authentication
router.use(authenticate);

// Profile routes
router.get("/profile", userController.getProfile);
router.put(
  "/profile",
  validate(updateProfileSchema),
  userController.updateProfile,
);
router.post(
  "/change-password",
  validate(changePasswordSchema),
  userController.changePassword,
);
router.get("/stats", userController.getUserStats);

// Order and review history
router.get("/orders", userController.getOrderHistory);
router.get("/reviews", userController.getMyReviews);

// Wishlist (placeholder)
router.get("/wishlist", userController.getFavorites);
router.post("/wishlist", userController.addToWishlist);

// Account deletion
router.delete(
  "/account",
  validate(deleteAccountSchema),
  userController.deleteAccount,
);

module.exports = router;
