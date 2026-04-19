const express = require('express');
const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

// /me routes must be before /:id to avoid conflict
router.get('/me', authenticate, userController.getMe);
router.put('/me', authenticate, userController.updateMe);

router.get('/', authenticate, authenticate.requireRole('admin'), userController.getAllUsers);
router.get('/:id', authenticate, userController.getUserById);
router.post('/', authenticate, authenticate.requireRole('admin'), userController.createUser);
router.put('/:id', authenticate, userController.updateUser);
router.delete('/:id', authenticate, authenticate.requireRole('admin'), userController.deleteUser);

module.exports = router;
