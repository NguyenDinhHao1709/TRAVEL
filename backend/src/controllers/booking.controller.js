const pool = require('../config/db');
const {
  sendBookingCancelledEmail
} = require('../services/email.service');

const PAYMENT_TIMEOUT_SECONDS = 5 * 60;

const autoConfirmPaidBookings = async (userId = null) => {
  const params = [];
  let query = `UPDATE bookings
               SET booking_status = 'confirmed'
               WHERE booking_status = 'pending'
                 AND payment_status = 'paid'`;

  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }

  const [result] = await pool.query(query, params);
  return result.affectedRows || 0;
};

const autoCancelExpiredBookings = async (userId = null) => {
  const connection = await pool.getConnection();
  const cancelledBookingIds = [];

  try {
    await connection.beginTransaction();

    const params = [PAYMENT_TIMEOUT_SECONDS];
    let query = `SELECT id, tour_id, people_count
                 FROM bookings
                 WHERE booking_status = 'pending'
                   AND payment_status = 'unpaid'
                   AND TIMESTAMPDIFF(SECOND, created_at, NOW()) >= ?`;

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' FOR UPDATE';

    const [expiredRows] = await connection.query(query, params);

    for (const booking of expiredRows) {
      const [updateResult] = await connection.query(
        `UPDATE bookings
         SET booking_status = 'cancelled'
         WHERE id = ?
           AND booking_status = 'pending'
           AND payment_status = 'unpaid'`,
        [booking.id]
      );

      if (updateResult.affectedRows > 0) {
        await connection.query('UPDATE tours SET slots = slots + ? WHERE id = ?', [booking.people_count, booking.tour_id]);
        cancelledBookingIds.push(booking.id);
      }
    }

    await connection.commit();
    return cancelledBookingIds;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const createBooking = async (req, res) => {
  try {
    const { tourId, departureDate: rawDepartureDate, peopleCount } = req.body;

    const parsedPeopleCount = Number(peopleCount);
    if (!parsedPeopleCount || parsedPeopleCount < 1 || !Number.isInteger(parsedPeopleCount)) {
      return res.status(400).json({ message: 'Số lượng người không hợp lệ (tối thiểu 1 người)' });
    }

    const [tourRows] = await pool.query('SELECT * FROM tours WHERE id = ?', [tourId]);
    if (!tourRows.length) {
      return res.status(404).json({ message: 'Không tìm thấy tour' });
    }

    const tour = tourRows[0];

    const tourStartDate = tour.start_date
      ? (tour.start_date instanceof Date
        ? tour.start_date.toISOString().slice(0, 10)
        : String(tour.start_date).slice(0, 10))
      : null;
    const departureDate = rawDepartureDate || tourStartDate;

    if (!departureDate) {
      return res.status(400).json({ message: 'Ngày khởi hành là bắt buộc' });
    }

    if (tour.slots < parsedPeopleCount) {
      return res.status(400).json({ message: `Không đủ chỗ, hiện còn ${tour.slots} chỗ trống` });
    }

    const totalAmount = Number(tour.price) * Number(peopleCount);

    const [result] = await pool.query(
      `INSERT INTO bookings (user_id, tour_id, departure_date, people_count, total_amount, booking_status, payment_status)
       VALUES (?, ?, ?, ?, ?, 'pending', 'unpaid')`,
      [req.user.id, tourId, departureDate, parsedPeopleCount, totalAmount]
    );

    await pool.query('UPDATE tours SET slots = slots - ? WHERE id = ?', [parsedPeopleCount, tourId]);

    return res.status(201).json({
      id: result.insertId,
      totalAmount,
      message: 'Booking created successfully'
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    await autoConfirmPaidBookings(req.user.id);
    await autoCancelExpiredBookings(req.user.id);

    const [rows] = await pool.query(
      `SELECT b.*, t.title, t.destination, t.latitude, t.longitude, t.start_date, t.end_date
       FROM bookings b
       JOIN tours t ON t.id = b.tour_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const cancelMyBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [id, req.user.id]);

    if (!rows.length) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = rows[0];

    if (booking.payment_status === 'paid') {
      return res.status(400).json({ message: 'Đơn đã thanh toán online, chưa thể hủy thủ công. Vui lòng liên hệ hỗ trợ để xử lý hoàn tiền.' });
    }

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    await pool.query('UPDATE bookings SET booking_status = ? WHERE id = ?', ['cancelled', id]);
    await pool.query('UPDATE tours SET slots = slots + ? WHERE id = ?', [booking.people_count, booking.tour_id]);

    return res.json({ message: 'Booking cancelled' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllBookingsForStaff = async (req, res) => {
  try {
    await autoConfirmPaidBookings();
    await autoCancelExpiredBookings();

    const [rows] = await pool.query(
      `SELECT b.*, u.full_name, u.email, t.title
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN tours t ON t.id = b.tour_id
       ORDER BY b.created_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const cancelBookingByStaff = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, t.title AS tour_title, u.full_name, u.email AS user_email
       FROM bookings b
       JOIN tours t ON t.id = b.tour_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ?`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = rows[0];

    if (booking.booking_status === 'pending' && booking.payment_status === 'unpaid') {
      return res.status(400).json({ message: 'Đơn chờ thanh toán online sẽ tự hủy khi hết hạn, nhân viên không cần hủy thủ công.' });
    }

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ message: 'Booking đã ở trạng thái hủy' });
    }

    const isRefundFlow = booking.payment_status === 'paid';

    await pool.query(
      'UPDATE bookings SET booking_status = ?, payment_status = ? WHERE id = ?',
      ['cancelled', isRefundFlow ? 'unpaid' : booking.payment_status, req.params.id]
    );
    await pool.query('UPDATE tours SET slots = slots + ? WHERE id = ?', [booking.people_count, booking.tour_id]);

    try {
      await sendBookingCancelledEmail({
        toEmail: booking.user_email,
        fullName: booking.full_name,
        tourTitle: booking.tour_title,
        bookingId: booking.id,
        reason: isRefundFlow ? 'Nhân viên đã xử lý hoàn vé theo yêu cầu của khách hàng' : 'Nhân viên hủy đặt tour'
      });
    } catch (mailErr) {
      console.error('Gửi email hủy booking thất bại:', mailErr.message);
    }

    return res.json({ message: isRefundFlow ? 'Đã hoàn vé cho khách hàng' : 'Booking cancelled by staff' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  autoCancelExpiredBookings,
  autoConfirmPaidBookings,
  PAYMENT_TIMEOUT_SECONDS,
  createBooking,
  getMyBookings,
  cancelMyBooking,
  getAllBookingsForStaff,
  cancelBookingByStaff
};
