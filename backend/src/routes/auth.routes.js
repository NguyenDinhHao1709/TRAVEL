const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rate-limit');
const router = express.Router();

router.post('/login', authLimiter, authController.login);
router.post('/register/request-otp', otpLimiter, authController.requestRegisterOtp);
router.post('/register', authLimiter, authController.register);
router.post('/forgot-password/request-otp', otpLimiter, authController.requestForgotPasswordOtp);
router.post('/forgot-password/reset', authLimiter, authController.resetForgotPassword);
router.put('/change-password', authenticate, authController.changePassword);
router.post('/refresh-token', authLimiter, authController.refreshToken);

module.exports = router;
