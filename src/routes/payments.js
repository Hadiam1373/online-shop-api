const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validation");
const Joi = require("joi");
const paymentController = require("../controllers/payments");

const router = express.Router();

// Validation schemas
const processPaymentSchema = Joi.object({
  orderId: Joi.string().required(),
  cardToken: Joi.string().required(),
  cardLast4: Joi.string().optional(),
});

const zarinpalRequestSchema = Joi.object({
  orderId: Joi.string().required(),
});

// Zarinpal callback does not require authentication
router.get("/zarinpal/callback", paymentController.verifyZarinpalPayment);

// All payment routes require authentication
router.use(authenticate);

// User routes
router.post(
  "/zarinpal/request",
  validate(zarinpalRequestSchema),
  paymentController.createZarinpalPayment,
);
router.get(
  "/zarinpal/start",
  validate(zarinpalRequestSchema),
  paymentController.startZarinpalPayment,
);
router.post(
  "/",
  validate(processPaymentSchema),
  paymentController.processPayment,
);
router.get("/order/:orderId", paymentController.getPaymentByOrder);

// Admin routes
router.get(
  "/admin/all",
  authorize(["ADMIN"]),
  paymentController.getAllPayments,
);
router.get(
  "/admin/stats",
  authorize(["ADMIN"]),
  paymentController.getPaymentStats,
);
router.post(
  "/:paymentId/refund",
  authorize(["ADMIN"]),
  paymentController.refundPayment,
);
router.get("/:paymentId", paymentController.getPayment);

module.exports = router;
