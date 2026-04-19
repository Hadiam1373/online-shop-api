const express = require("express");
const Joi = require("joi");
const validate = require("../middlewares/validation");
const { authenticate, authorize } = require("../middlewares/auth");
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/products");

const router = express.Router();

const productSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string(),
  price: Joi.number().positive().required(),
  discountPrice: Joi.number().positive().optional(),
  stock: Joi.number().integer().min(0).required(),
  images: Joi.array().items(Joi.string()).required(),
  categoryId: Joi.string().required(),
  attributes: Joi.object().optional(),
});

const updateProductSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string(),
  price: Joi.number().positive(),
  discountPrice: Joi.number().positive().optional(),
  stock: Joi.number().integer().min(0),
  images: Joi.array().items(Joi.string()),
  categoryId: Joi.string(),
  attributes: Joi.object(),
}).min(1);

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(productSchema),
  createProduct,
);
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateProductSchema),
  updateProduct,
);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteProduct);

module.exports = router;
