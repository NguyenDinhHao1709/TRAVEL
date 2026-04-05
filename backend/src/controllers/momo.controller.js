const pool = require('../config/db');
const { autoCancelExpiredBookings } = require('./booking.controller');
const { sendPaymentSuccessEmail } = require('../services/email.service');
const {
  generateMoMoPaymentUrl,
  verifyMoMoReturn,
  extractBookingIdFromOrderId
} = require('../services/momo.service');

const createMoMoPaymentUrl = async (req, res) => {
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

    const result = await generateMoMoPaymentUrl(bookingId, Number(booking.total_amount), `Thanh toan booking ${bookingId}`);
    return res.json({ paymentUrl: result.payUrl });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Không thể tạo URL thanh toán MoMo' });
  }
};

const finalizeMoMoPayment = async (params) => {
  const isValid = verifyMoMoReturn({ ...params });

  if (!isValid) {
    return { status: 400, payload: { message: 'Chữ ký thanh toán MoMo không hợp lệ' } };
  }

  const bookingId = extractBookingIdFromOrderId(params.orderId);

  if (!bookingId) {
    return { status: 400, payload: { message: 'Mã đơn hàng MoMo không hợp lệ' } };
  }

  const isPaid = String(params.resultCode) === '0';
  const amount = Number(params.amount || 0);
  const transactionCode = params.transId || '';

  const [bookingRows] = await pool.query('SELECT id, payment_status FROM bookings WHERE id = ?', [bookingId]);
  if (!bookingRows.length) {
    return { status: 404, payload: { message: 'Không tìm thấy đơn đặt tour cần cập nhật' } };
  }

  const [existingPayments] = await pool.query(
    'SELECT id FROM payments WHERE booking_id = ? AND method = ? AND transaction_code = ? LIMIT 1',
    [bookingId, 'momo', transactionCode || '']
  );

  if (!existingPayments.length) {
    await pool.query(
      'INSERT INTO payments (booking_id, amount, method, transaction_code, status) VALUES (?, ?, ?, ?, ?)',
      [bookingId, amount, 'momo', transactionCode || null, isPaid ? 'success' : 'failed']
    );
  }

  if (isPaid && bookingRows[0].payment_status !== 'paid') {
    await pool.query('UPDATE bookings SET payment_status = ?, booking_status = ? WHERE id = ?', ['paid', 'confirmed', bookingId]);

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
      console.error('Gửi email thanh toán MoMo thất bại:', mailErr.message);
    }
  }

  return {
    status: 200,
    payload: {
      success: isPaid,
      message: isPaid ? 'Thanh toán MoMo thành công' : (params.message || 'Thanh toán MoMo thất bại'),
      bookingId,
      responseCode: String(params.resultCode || ''),
      transactionCode,
      amount
    }
  };
};

const handleMoMoReturn = async (req, res) => {
  try {
    const result = await finalizeMoMoPayment(req.query);
    return res.status(result.status).json(result.payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const handleMoMoIpn = async (req, res) => {
  try {
    const result = await finalizeMoMoPayment(req.body);
    return res.status(result.status).json(result.payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { createMoMoPaymentUrl, handleMoMoReturn, handleMoMoIpn };
