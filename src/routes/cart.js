const express = require("express");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validation");
const Joi = require("joi");
const cartController = require("../controllers/cart");

const router = express.Router();

// Validation schemas
const addToCartSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().min(1).required(),
});

const updateCartItemSchema = Joi.object({
  quantity: Joi.number().min(0).required(),
});

const couponSchema = Joi.object({
  couponCode: Joi.string().optional(),
});

// All cart routes require authentication
router.use(authenticate);

// Routes
router.get("/", cartController.getCart);
router.post(
  "/calculate-total",
  validate(couponSchema),
  cartController.calculateTotal,
);
router.post("/", validate(addToCartSchema), cartController.addToCart);
router.put(
  "/:cartItemId",
  validate(updateCartItemSchema),
  cartController.updateCartItem,
);
// Increment / decrement quantity by 1
router.post("/:cartItemId/increment", cartController.incrementCartItem);
router.post("/:cartItemId/decrement", cartController.decrementCartItem);
router.delete("/", cartController.clearCart);
router.delete("/:cartItemId", cartController.removeFromCart);

module.exports = router;
