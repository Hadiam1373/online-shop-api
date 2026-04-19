const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const adminController = require('../controllers/admin');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['ADMIN']));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId/role', adminController.updateUserRole);
router.post('/users/:userId/ban', adminController.banUser);

// Reports
router.get('/reports/sales', adminController.getSalesReport);
router.get('/reports/products', adminController.getProductReport);
router.get('/reports/inventory', adminController.getInventoryReport);
router.get('/reports/customers', adminController.getCustomerInsights);

module.exports = router;