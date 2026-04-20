const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validation");
const Joi = require("joi");
const categoryController = require("../controllers/categories");

const router = express.Router();

// Validation schemas
const createCategorySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  parentId: Joi.string().optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  parentId: Joi.string().optional(),
});

// Routes
router.get("/tree", categoryController.getCategoryTree);
router.get("/", categoryController.getCategories);
router.get("/:id", categoryController.getCategoryById);

router.post(
  "/",
  authenticate,
  authorize(["ADMIN"]),
  validate(createCategorySchema),
  categoryController.createCategory,
);

router.put(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  validate(updateCategorySchema),
  categoryController.updateCategory,
);

router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  categoryController.deleteCategory,
);

module.exports = router;
