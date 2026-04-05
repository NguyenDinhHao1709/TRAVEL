const pool = require('../config/db');
const { simulateExternalPayment } = require('../services/payment.service');
const { sendPaymentSuccessEmail } = require('../services/email.service');

const payForBooking = async (req, res) => {
  try {
    const { bookingId, method } = req.body;

    const [rows] = await pool.query(
      `SELECT b.*, t.title AS tour_title, t.end_date, u.full_name, u.email AS user_email
       FROM bookings b
       JOIN tours t ON t.id = b.tour_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ? AND b.user_id = ?`,
      [bookingId, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = rows[0];
    const externalResult = await simulateExternalPayment(bookingId, method);

    await pool.query(
      'INSERT INTO payments (booking_id, amount, method, transaction_code, status) VALUES (?, ?, ?, ?, ?)',
      [bookingId, booking.total_amount, method, externalResult.transactionCode, externalResult.status]
    );

    const paid = externalResult.status === 'success';

    await pool.query('UPDATE bookings SET payment_status = ?, booking_status = ? WHERE id = ?', [
      paid ? 'paid' : 'unpaid',
      paid ? 'confirmed' : booking.booking_status,
      bookingId
    ]);

    if (paid) {
      try {
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
      } catch (mailErr) {
        console.error('Gửi email thanh toán thất bại:', mailErr.message);
      }
    }

    return res.json({
      message: paid ? 'Payment success. Booking confirmed.' : 'Payment failed. Please retry.',
      result: externalResult
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { payForBooking };
