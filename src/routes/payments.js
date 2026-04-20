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

// All payment routes require authentication
router.use(authenticate);

// User routes
router.post(
  "/",
  validate(processPaymentSchema),
  paymentController.processPayment,
);
router.get("/:paymentId", paymentController.getPayment);
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

module.exports = router;
