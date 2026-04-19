const express = require('express');
const adminController = require('../controllers/admin.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

const requireAdmin = [authenticate, authenticate.requireRole('admin')];

router.get('/dashboard', ...requireAdmin, adminController.getDashboardStats);
router.get('/users', ...requireAdmin, adminController.getUsers);
router.get('/users/:userId/detail', ...requireAdmin, adminController.getUserDetail);
router.patch('/users/:userId/lock', ...requireAdmin, adminController.lockUser);
router.patch('/users/:userId/unlock', ...requireAdmin, adminController.unlockUser);
router.delete('/users/:userId', ...requireAdmin, adminController.deleteUser);
router.patch('/users/:userId/reset-password', ...requireAdmin, adminController.resetUserPassword);
router.get('/logs', ...requireAdmin, adminController.getLogs);
router.get('/bookings-report', ...requireAdmin, adminController.getBookingsReport);

module.exports = router;