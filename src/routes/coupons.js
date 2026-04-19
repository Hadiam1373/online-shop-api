const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate } = require('../middlewares/validation');
const Joi = require('joi');
const couponController = require('../controllers/coupons');

const router = express.Router();

// Validation schemas
const createCouponSchema = Joi.object({
  code: Joi.string().required(),
  discountType: Joi.string().valid('PERCENTAGE', 'FIXED').required(),
  discountValue: Joi.number().required(),
  expirationDate: Joi.string().optional(),
  usageLimit: Joi.number().optional(),
});

const updateCouponSchema = Joi.object({
  discountValue: Joi.number().optional(),
  expirationDate: Joi.string().optional(),
  usageLimit: Joi.number().optional(),
});

const validateCouponSchema = Joi.object({
  code: Joi.string().required(),
});

// Public routes
router.post('/validate', validate(validateCouponSchema), couponController.validateCoupon);
router.get('/:code', couponController.getCouponByCode);

// Authentication required
router.use(authenticate);

router.get('/', couponController.getCoupons);

// Admin only routes
router.post(
  '/',
  authorize(['ADMIN']),
  validate(createCouponSchema),
  couponController.createCoupon
);

router.put(
  '/:id',
  authorize(['ADMIN']),
  validate(updateCouponSchema),
  couponController.updateCoupon
);

router.delete(
  '/:id',
  authorize(['ADMIN']),
  couponController.deleteCoupon
);

router.get('/admin/stats', authorize(['ADMIN']), couponController.getCouponStats);

module.exports = router;