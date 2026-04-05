const express = require('express');
const {
	register,
	requestRegisterOtp,
	requestForgotPasswordOtp,
	resetPasswordWithOtp,
	login,
	me,
	changePassword,
	getCaptcha
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { authLimiter, loginLimiter, otpRequestLimiter } = require('../middleware/rate-limit');

const router = express.Router();

router.use(authLimiter);

router.get('/captcha', getCaptcha);
router.post('/register/request-otp', otpRequestLimiter, requestRegisterOtp);
router.post('/register', register);
router.post('/forgot-password/request-otp', otpRequestLimiter, requestForgotPasswordOtp);
router.post('/forgot-password/reset', resetPasswordWithOtp);
router.post('/login', loginLimiter, login);
router.get('/me', authenticate, me);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
