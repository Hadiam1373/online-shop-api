const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate } = require('../middlewares/validation');
const Joi = require('joi');
const orderController = require('../controllers/orders');

const router = express.Router();

// Validation schemas
const createOrderSchema = Joi.object({
  couponCode: Joi.string().optional(),
});

const updateOrderSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED').required(),
});

// All order routes require authentication
router.use(authenticate);

// User routes
router.get('/', orderController.getOrders);
router.post('/', validate(createOrderSchema), orderController.createOrder);
router.get('/:id', orderController.getOrderById);
router.put('/:id/cancel', orderController.cancelOrder);

// Admin routes
router.get('/admin/all', authorize(['ADMIN']), orderController.getAllOrders);
router.put('/:id/status', authorize(['ADMIN', 'OPERATOR']), validate(updateOrderSchema), orderController.updateOrderStatus);
router.get('/admin/stats', authorize(['ADMIN']), orderController.getOrderStats);

module.exports = router;