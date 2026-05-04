const pool = require('../config/db');
const emailService = require('../services/email.service');

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
  // Kiểm tra ngày khởi hành
  const now = new Date();
  const startDate = tour.start_date ? new Date(tour.start_date) : null;
  if (startDate && now > startDate) {
    return res.status(400).json({ message: 'Tour này đã khởi hành, vui lòng chọn ngày khác' });
  }
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

  // Gửi email xác nhận đặt tour (fire-and-forget)
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
  const fmtMoney = (n) => Number(n).toLocaleString('vi-VN') + ' ₫';
  emailService.sendMail(
    req.user.email,
    `Xác nhận đặt tour — ${tour.title}`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
      <h2 style="color:#0d6efd">HK2 Travel — Xác nhận đặt tour</h2>
      <p>Xin chào,</p>
      <p>Chúng tôi đã nhận được yêu cầu đặt tour của bạn. Vui lòng hoàn tất thanh toán để xác nhận chỗ.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Mã đặt tour</strong></td><td style="padding:8px;border:1px solid #dee2e6">#${result.insertId}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Tour</strong></td><td style="padding:8px;border:1px solid #dee2e6">${tour.title}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Ngày khởi hành</strong></td><td style="padding:8px;border:1px solid #dee2e6">${fmtDate(tour.start_date)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Số người</strong></td><td style="padding:8px;border:1px solid #dee2e6">${count}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Tổng tiền</strong></td><td style="padding:8px;border:1px solid #dee2e6"><strong style="color:#dc3545">${fmtMoney(totalAmount)}</strong></td></tr>
        <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Trạng thái</strong></td><td style="padding:8px;border:1px solid #dee2e6"><span style="color:#fd7e14">Chờ thanh toán</span></td></tr>
      </table>
      <p>Vui lòng thanh toán trong vòng <strong>5 phút</strong> để giữ chỗ. Đơn sẽ tự động hủy nếu quá thời hạn.</p>
      <p style="color:#6c757d;font-size:13px">Email này được gửi tự động, vui lòng không trả lời trực tiếp.</p>
    </div>`
  ).catch(() => {});

  // Log system_logs
  const logService = require('../services/log.service');
  await logService.logAction({
    req,
    userId: userId,
    role: req.user.role,
    action: 'Đặt tour',
    actionDetail: `User đặt tour ID: ${tourId}, booking ID: ${result.insertId}, số người: ${count}`,
    details: { bookingId: result.insertId, tourId, peopleCount: count, totalAmount }
  });
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

  const [rows] = await pool.execute(`
    SELECT b.*, t.title AS tour_title, t.start_date, u.email AS user_email, u.full_name AS user_name
    FROM bookings b
    LEFT JOIN tours t ON t.id = b.tour_id
    LEFT JOIN users u ON u.id = b.user_id
    WHERE b.id = ? LIMIT 1
  `, [id]);
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

  // Gửi email thông báo hoàn vé (fire-and-forget)
  if (booking.user_email) {
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
    const fmtMoney = (n) => Number(n).toLocaleString('vi-VN') + ' ₫';
    emailService.sendMail(
      booking.user_email,
      `Thông báo hoàn vé — ${booking.tour_title || 'Tour'}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
        <h2 style="color:#dc3545">HK2 Travel — Thông báo hoàn vé</h2>
        <p>Xin chào${booking.user_name ? ' <strong>' + booking.user_name + '</strong>' : ''},</p>
        <p>Đơn đặt tour của bạn đã được nhân viên xử lý hủy và hoàn vé. Dưới đây là thông tin chi tiết:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Mã đặt tour</strong></td><td style="padding:8px;border:1px solid #dee2e6">#${id}</td></tr>
          <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Tour</strong></td><td style="padding:8px;border:1px solid #dee2e6">${booking.tour_title || '—'}</td></tr>
          <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Ngày khởi hành</strong></td><td style="padding:8px;border:1px solid #dee2e6">${fmtDate(booking.start_date)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Số người</strong></td><td style="padding:8px;border:1px solid #dee2e6">${booking.people_count}</td></tr>
          <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Số tiền hoàn trả</strong></td><td style="padding:8px;border:1px solid #dee2e6"><strong style="color:#198754">${fmtMoney(booking.total_amount)}</strong></td></tr>
          <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Trạng thái</strong></td><td style="padding:8px;border:1px solid #dee2e6"><span style="color:#dc3545">Đã hủy &amp; hoàn vé</span></td></tr>
        </table>
        <p>Số tiền hoàn trả sẽ được xử lý theo phương thức thanh toán ban đầu của bạn. Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
        <p style="color:#6c757d;font-size:13px">Email này được gửi tự động, vui lòng không trả lời trực tiếp.</p>
      </div>`
    ).catch(() => {});
  }
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
