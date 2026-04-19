const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, authenticate.requireRole('admin', 'staff'), dashboardController.getDashboardStats);

module.exports = router;
