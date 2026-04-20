const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validation");
const Joi = require("joi");
const reviewController = require("../controllers/reviews");

const router = express.Router();

// Validation schemas
const createReviewSchema = Joi.object({
  productId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().optional(),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).optional(),
  comment: Joi.string().optional(),
});

const moderateReviewSchema = Joi.object({
  approve: Joi.boolean().required(),
});

// Public routes
router.get("/product/:productId", reviewController.getProductReviews);
router.get("/:id", reviewController.getReviewById);

// Authentication required
router.use(authenticate);

router.get("/", reviewController.getUserReviews);
router.post("/", validate(createReviewSchema), reviewController.createReview);
router.put("/:id", validate(updateReviewSchema), reviewController.updateReview);
router.delete("/:id", reviewController.deleteReview);

// Admin routes
router.get(
  "/admin/stats",
  authorize(["ADMIN"]),
  reviewController.getReviewStats,
);
router.get(
  "/admin/pending",
  authorize(["ADMIN"]),
  reviewController.getPendingReviews,
);
router.post(
  "/:id/moderate",
  authorize(["ADMIN"]),
  validate(moderateReviewSchema),
  reviewController.moderateReview,
);

module.exports = router;
