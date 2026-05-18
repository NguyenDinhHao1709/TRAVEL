const express = require('express');
const paymentController = require('../controllers/payment.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

// ─── PayOS ────────────────────────────────────────────────────────────────────
// Tạo PayOS payment link (trả về qrCode + checkoutUrl)
router.post('/vietqr/create', authenticate, paymentController.createVietQR);

// Kiểm tra trạng thái thanh toán (frontend dùng để polling)
router.get('/status/:bookingId', authenticate, paymentController.checkPaymentStatus);

// Webhook từ PayOS khi thanh toán thành công (public — xác thực bằng SDK)
router.post('/webhook/sepay', paymentController.sePayWebhook);
router.post('/webhook/payos', paymentController.sePayWebhook);

module.exports = router;
