const pool = require('../config/db');
const { generateVNPayUrl, verifyVNPayReturn, extractBookingIdFromTxnRef } = require('../services/vnpay.service');
const { autoCancelExpiredBookings } = require('./booking.controller');
const { sendPaymentSuccessEmail } = require('../services/email.service');

const createVNPayPaymentUrl = async (req, res) => {
  try {
    const { bookingId } = req.body;

    await autoCancelExpiredBookings(req.user.id);

    if (!bookingId) {
      return res.status(400).json({ message: 'Thiếu mã booking để tạo thanh toán' });
    }

    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [bookingId, req.user.id]);

    if (!rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy đơn đặt tour' });
    }

    const booking = rows[0];

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ message: 'Booking đã bị hủy, không thể thanh toán' });
    }

    if (booking.payment_status === 'paid') {
      return res.status(400).json({ message: 'Booking này đã được thanh toán' });
    }

    const paymentUrl = generateVNPayUrl(bookingId, Number(booking.total_amount), `Booking ${bookingId}`);

    return res.json({ paymentUrl });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Không thể tạo URL thanh toán VNPAY' });
  }
};

const handleVNPayReturn = async (req, res) => {
  try {
    const vnpayParams = { ...req.query };
    const isValid = verifyVNPayReturn(vnpayParams);

    if (!isValid) {
      return res.status(400).json({ message: 'Chữ ký thanh toán không hợp lệ' });
    }

    const bookingId = extractBookingIdFromTxnRef(req.query.vnp_TxnRef);

    if (!bookingId) {
      return res.status(400).json({ message: 'Mã giao dịch không hợp lệ' });
    }

    const responseCode = req.query.vnp_ResponseCode;
    const transactionCode = req.query.vnp_TransactionNo;
    const amount = Number(req.query.vnp_Amount || 0) / 100;

    const isPaid = responseCode === '00';

    const [bookingRows] = await pool.query('SELECT id, booking_status, payment_status, total_amount FROM bookings WHERE id = ?', [bookingId]);

    if (!bookingRows.length) {
      return res.status(404).json({ message: 'Không tìm thấy đơn đặt tour cần cập nhật' });
    }

    const [existingPayments] = await pool.query(
      'SELECT id, status FROM payments WHERE booking_id = ? AND method = ? AND transaction_code = ? LIMIT 1',
      [bookingId, 'vnpay', transactionCode || '']
    );

    if (!existingPayments.length) {
      await pool.query(
        'INSERT INTO payments (booking_id, amount, method, transaction_code, status) VALUES (?, ?, ?, ?, ?)',
        [bookingId, amount, 'vnpay', transactionCode || null, isPaid ? 'success' : 'failed']
      );
    }

    if (isPaid && bookingRows[0].payment_status !== 'paid') {
      await pool.query('UPDATE bookings SET payment_status = ?, booking_status = ? WHERE id = ?', [
        'paid',
        'confirmed',
        bookingId
      ]);

      try {
        const [[booking]] = await pool.query(
          `SELECT b.id, b.departure_date, b.people_count, b.total_amount,
                  t.title AS tour_title, t.end_date,
                  u.full_name, u.email AS user_email
           FROM bookings b
           JOIN tours t ON t.id = b.tour_id
           JOIN users u ON u.id = b.user_id
           WHERE b.id = ?`,
          [bookingId]
        );

        if (booking?.user_email) {
          await sendPaymentSuccessEmail({
            toEmail: booking.user_email,
            fullName: booking.full_name,
            tourTitle: booking.tour_title,
            departureDate: booking.departure_date,
            endDate: booking.end_date,
            peopleCount: booking.people_count,
            totalAmount: booking.total_amount,
            bookingId
          });
        }
      } catch (mailErr) {
        console.error('Gửi email thanh toán VNPay thất bại:', mailErr.message);
      }
    }

    return res.json({
      success: isPaid,
      message: isPaid ? 'Thanh toán thành công' : 'Thanh toán thất bại',
      bookingId,
      responseCode,
      transactionCode: transactionCode || '',
      amount
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { createVNPayPaymentUrl, handleVNPayReturn };
