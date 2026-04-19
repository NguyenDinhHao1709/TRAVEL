const express = require('express');
const staffController = require('../controllers/staff.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

router.get('/customers', authenticate, authenticate.requireRole('staff', 'admin'), staffController.getCustomers);
router.get('/', authenticate, authenticate.requireRole('admin'), staffController.getAllStaff);
router.get('/:id', authenticate, authenticate.requireRole('admin'), staffController.getStaffById);
router.post('/', authenticate, authenticate.requireRole('admin'), staffController.createStaff);
router.put('/:id', authenticate, authenticate.requireRole('admin'), staffController.updateStaff);
router.delete('/:id', authenticate, authenticate.requireRole('admin'), staffController.deleteStaff);

module.exports = router;
