const pool = require('../config/db');

const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút

// Hủy các booking hết hạn thanh toán
async function cancelExpiredBookings(userId) {
  await pool.execute(`
    UPDATE bookings b
    JOIN tours t ON t.id = b.tour_id
    SET b.booking_status = 'cancelled', t.slots = t.slots + b.people_count
    WHERE b.user_id = ? AND b.booking_status = 'pending' AND b.payment_status = 'unpaid'
      AND b.created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
  `, [userId]);
}

exports.getMyBookings = async (req, res) => {
  const userId = req.user.id;
  await cancelExpiredBookings(userId);

  const [rows] = await pool.execute(`
    SELECT b.*, t.title, t.start_date, t.end_date, t.destination, t.image_url
    FROM bookings b
    LEFT JOIN tours t ON t.id = b.tour_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `, [userId]);

  res.json(rows);
};

exports.getAllBookings = async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT b.*, t.title, u.full_name
    FROM bookings b
    LEFT JOIN tours t ON t.id = b.tour_id
    LEFT JOIN users u ON u.id = b.user_id
    ORDER BY b.created_at DESC
  `);
  res.json(rows);
};

exports.getStaffBookings = async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT b.*, t.title, t.start_date, t.end_date, u.full_name, u.email
    FROM bookings b
    LEFT JOIN tours t ON t.id = b.tour_id
    LEFT JOIN users u ON u.id = b.user_id
    ORDER BY b.created_at DESC
  `);
  res.json(rows);
};

exports.getBookingById = async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute(`
    SELECT b.*, t.title, t.start_date, t.end_date
    FROM bookings b
    LEFT JOIN tours t ON t.id = b.tour_id
    WHERE b.id = ? LIMIT 1
  `, [id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy booking' });
  res.json(rows[0]);
};

exports.createBooking = async (req, res) => {
  const userId = req.user.id;
  const { tourId, peopleCount } = req.body;

  if (!tourId || !peopleCount || Number(peopleCount) < 1) {
    return res.status(400).json({ message: 'Thông tin đặt tour không hợp lệ' });
  }

  const count = Math.floor(Number(peopleCount));

  // Lấy thông tin tour và kiểm tra slot
  const [tourRows] = await pool.execute(
    'SELECT id, title, price, slots, start_date FROM tours WHERE id = ? LIMIT 1',
    [tourId]
  );
  if (tourRows.length === 0) return res.status(404).json({ message: 'Không tìm thấy tour' });

  const tour = tourRows[0];
  if (tour.slots < count) {
    return res.status(400).json({ message: `Chỉ còn ${tour.slots} chỗ trống` });
  }

  const totalAmount = Number(tour.price) * count;

  // Giảm slot và tạo booking
  await pool.execute('UPDATE tours SET slots = slots - ? WHERE id = ? AND slots >= ?', [count, tourId, count]);
  const [result] = await pool.execute(
    'INSERT INTO bookings (user_id, tour_id, people_count, total_amount, booking_status, payment_status) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, tourId, count, totalAmount, 'pending', 'unpaid']
  );

  res.status(201).json({ id: result.insertId, message: 'Đặt tour thành công' });
};

exports.cancelMyBooking = async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.params;

  const [rows] = await pool.execute(
    'SELECT * FROM bookings WHERE id = ? AND user_id = ? LIMIT 1',
    [bookingId, userId]
  );

  if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy đơn' });
  const booking = rows[0];

  if (booking.booking_status === 'cancelled') {
    return res.status(400).json({ message: 'Đơn đã bị hủy' });
  }
  if (booking.payment_status === 'paid') {
    return res.status(400).json({ message: 'Đơn đã thanh toán, vui lòng liên hệ hỗ trợ' });
  }

  await pool.execute('UPDATE bookings SET booking_status = ?, updated_at = NOW() WHERE id = ?', ['cancelled', bookingId]);
  await pool.execute('UPDATE tours SET slots = slots + ? WHERE id = ?', [booking.people_count, booking.tour_id]);

  res.json({ message: 'Đã hủy đặt tour' });
};

exports.staffCancelBooking = async (req, res) => {
  const { id } = req.params;
  const staffId = req.user?.id || null;

  const [rows] = await pool.execute('SELECT * FROM bookings WHERE id = ? LIMIT 1', [id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy đơn' });
  const booking = rows[0];

  await pool.execute(
    'UPDATE bookings SET booking_status = ?, payment_status = ?, confirmed_by_staff_id = ?, updated_at = NOW() WHERE id = ?',
    ['cancelled', 'refunded', staffId, id]
  );
  await pool.execute('UPDATE tours SET slots = slots + ? WHERE id = ?', [booking.people_count, booking.tour_id]);

  // Log
  pool.execute('INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)',
    [staffId, req.user.role, 'Hủy booking', `Hủy & hoàn vé booking ID: ${id}`]).catch(() => {});

  res.json({ message: 'Đã xử lý hoàn vé' });
};

exports.updateBooking = async (req, res) => {
  const { id } = req.params;
  const { bookingStatus, paymentStatus } = req.body;
  const staffId = req.user?.role === 'staff' ? req.user.id : null;

  await pool.execute(
    'UPDATE bookings SET booking_status = COALESCE(?, booking_status), payment_status = COALESCE(?, payment_status), confirmed_by_staff_id = COALESCE(?, confirmed_by_staff_id), updated_at = NOW() WHERE id = ?',
    [bookingStatus || null, paymentStatus || null, staffId, id]
  );
  res.json({ message: 'Cập nhật booking thành công' });

  // Log
  const action = bookingStatus === 'confirmed' ? 'Xác nhận booking' : 'Cập nhật booking';
  pool.execute('INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)',
    [req.user.id, req.user.role, action, `${action} ID: ${id} (status: ${bookingStatus || 'unchanged'}, payment: ${paymentStatus || 'unchanged'})`]).catch(() => {});
};

exports.deleteBooking = async (req, res) => {
  const { id } = req.params;
  await pool.execute('DELETE FROM bookings WHERE id = ?', [id]);
  res.json({ message: 'Xóa booking thành công' });
};
