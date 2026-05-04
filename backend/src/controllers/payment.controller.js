const pool = require('../config/db');
const paymentService = require('../services/payment.service');
const emailService = require('../services/email.service');

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtMoney = (n) => Number(n).toLocaleString('vi-VN') + ' ₫';

function buildPaymentConfirmEmail({ bookingId, fullName, tourTitle, startDate, peopleCount, totalAmount, paymentMethod, transactionCode }) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
    <h2 style="color:#198754">HK2 Travel — Thanh toán thành công</h2>
    <p>Xin chào${fullName ? ' <strong>' + fullName + '</strong>' : ''},</p>
    <p>Thanh toán của bạn đã được xác nhận. Chúc bạn có chuyến du lịch tuyệt vời!</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Mã đặt tour</strong></td><td style="padding:8px;border:1px solid #dee2e6">#${bookingId}</td></tr>
      <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Tour</strong></td><td style="padding:8px;border:1px solid #dee2e6">${tourTitle}</td></tr>
      <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Ngày khởi hành</strong></td><td style="padding:8px;border:1px solid #dee2e6">${fmtDate(startDate)}</td></tr>
      <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Số người</strong></td><td style="padding:8px;border:1px solid #dee2e6">${peopleCount}</td></tr>
      <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Số tiền đã thanh toán</strong></td><td style="padding:8px;border:1px solid #dee2e6"><strong style="color:#198754">${fmtMoney(totalAmount)}</strong></td></tr>
      <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Phương thức</strong></td><td style="padding:8px;border:1px solid #dee2e6">${paymentMethod}</td></tr>
      ${transactionCode ? `<tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Mã giao dịch</strong></td><td style="padding:8px;border:1px solid #dee2e6">${transactionCode}</td></tr>` : ''}
      <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Trạng thái</strong></td><td style="padding:8px;border:1px solid #dee2e6"><span style="color:#198754">✓ Đã xác nhận</span></td></tr>
    </table>
    <p style="color:#6c757d;font-size:13px">Email này được gửi tự động, vui lòng không trả lời trực tiếp.</p>
  </div>`;
}

// Tạo URL thanh toán VNPay
exports.createVnpayUrl = async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.body;

  if (!bookingId) {
    return res.status(400).json({ message: 'Thiếu bookingId' });
  }

  const [rows] = await pool.execute(
    'SELECT * FROM bookings WHERE id = ? AND user_id = ? LIMIT 1',
    [bookingId, userId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Không tìm thấy đơn đặt tour' });
  }

  const booking = rows[0];

  if (booking.payment_status === 'paid') {
    return res.status(400).json({ message: 'Đơn đã được thanh toán' });
  }

  if (booking.booking_status === 'cancelled') {
    return res.status(400).json({ message: 'Đơn đã bị hủy' });
  }

  if (!paymentService.isConfigured()) {
    return res.status(500).json({ message: 'VNPay chưa được cấu hình. Vui lòng liên hệ admin.' });
  }

  let ipAddr = req.headers['x-forwarded-for'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '127.0.0.1';
  // Normalize IPv6 loopback to IPv4
  ipAddr = String(ipAddr).split(',')[0].trim();
  if (ipAddr === '::1') ipAddr = '127.0.0.1';
  if (ipAddr.startsWith('::ffff:')) ipAddr = ipAddr.slice(7);

  const orderInfo = `HK2 Travel Don hang ${bookingId}`;
  const { paymentUrl, txnRef } = paymentService.createPaymentUrl(
    bookingId,
    Number(booking.total_amount),
    orderInfo,
    ipAddr
  );

  // Lưu txnRef
  await pool.execute(
    'UPDATE bookings SET vnpay_txn_ref = ?, updated_at = NOW() WHERE id = ?',
    [txnRef, bookingId]
  );

  res.json({ paymentUrl });
};

// Xử lý VNPay return
exports.vnpayReturn = async (req, res) => {
  const params = req.query;

  if (!paymentService.isConfigured()) {
    return res.json({
      success: false,
      message: 'VNPay chưa được cấu hình',
      responseCode: '99'
    });
  }

  const result = paymentService.verifyReturn(params);

  if (!result.valid) {
    return res.json({
      success: false,
      message: 'Chữ ký không hợp lệ',
      responseCode: result.responseCode
    });
  }

  // Tách bookingId từ txnRef (format: bookingId_timestamp)
  const txnRefParts = String(result.txnRef || '').split('_');
  const bookingId = txnRefParts[0];

  if (result.responseCode === '00') {
    // Thanh toán thành công
    await pool.execute(
      "UPDATE bookings SET payment_status = 'paid', booking_status = 'confirmed', vnpay_transaction_no = ?, payment_method = 'vnpay', updated_at = NOW() WHERE id = ?",
      [result.transactionNo || null, bookingId]
    );

    // Gửi email xác nhận thanh toán (fire-and-forget)
    pool.execute(`
      SELECT b.people_count, b.total_amount, t.title, t.start_date, u.email, u.full_name
      FROM bookings b
      LEFT JOIN tours t ON t.id = b.tour_id
      LEFT JOIN users u ON u.id = b.user_id
      WHERE b.id = ? LIMIT 1
    `, [bookingId]).then(([rows]) => {
      if (!rows.length || !rows[0].email) return;
      const r = rows[0];
      emailService.sendMail(
        r.email,
        `Thanh toán thành công — ${r.title}`,
        buildPaymentConfirmEmail({
          bookingId, fullName: r.full_name, tourTitle: r.title,
          startDate: r.start_date, peopleCount: r.people_count,
          totalAmount: r.total_amount, paymentMethod: 'VNPAY',
          transactionCode: result.transactionNo
        })
      ).catch(() => {});
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Thanh toán thành công',
      bookingId,
      amount: result.amount,
      responseCode: result.responseCode,
      transactionCode: result.transactionNo
    });
  }

  // Thanh toán thất bại
  const failMessages = {
    '24': 'Giao dịch bị hủy bởi khách hàng',
    '11': 'Đã hết hạn chờ thanh toán',
    '13': 'Nhập sai OTP quá số lần quy định',
    '51': 'Tài khoản không đủ số dư',
    '65': 'Vượt quá hạn mức giao dịch trong ngày'
  };

  res.json({
    success: false,
    message: failMessages[result.responseCode] || 'Thanh toán không thành công',
    bookingId,
    amount: result.amount,
    responseCode: result.responseCode,
    transactionCode: result.transactionNo
  });
};

// Dev-only: simulate successful payment without going through VNPay
exports.devSimulatePayment = async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.params;

  const [rows] = await pool.execute(
    'SELECT * FROM bookings WHERE id = ? AND user_id = ? LIMIT 1',
    [bookingId, userId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Không tìm thấy đơn đặt tour' });
  }

  const booking = rows[0];

  if (booking.payment_status === 'paid') {
    return res.status(400).json({ message: 'Đơn đã được thanh toán' });
  }
  if (booking.booking_status === 'cancelled') {
    return res.status(400).json({ message: 'Đơn đã bị hủy' });
  }

  await pool.execute(
    "UPDATE bookings SET payment_status = 'paid', booking_status = 'confirmed', payment_method = 'dev_simulate', updated_at = NOW() WHERE id = ?",
    [bookingId]
  );

  // Gửi email xác nhận thanh toán (fire-and-forget)
  pool.execute(`
    SELECT b.people_count, b.total_amount, t.title, t.start_date, u.email, u.full_name
    FROM bookings b
    LEFT JOIN tours t ON t.id = b.tour_id
    LEFT JOIN users u ON u.id = b.user_id
    WHERE b.id = ? LIMIT 1
  `, [bookingId]).then(([rows]) => {
    if (!rows.length || !rows[0].email) return;
    const r = rows[0];
    emailService.sendMail(
      r.email,
      `Thanh toán thành công — ${r.title}`,
      buildPaymentConfirmEmail({
        bookingId, fullName: r.full_name, tourTitle: r.title,
        startDate: r.start_date, peopleCount: r.people_count,
        totalAmount: r.total_amount, paymentMethod: 'Dev Simulate',
        transactionCode: null
      })
    ).catch(() => {});
  }).catch(() => {});

  res.json({ success: true, message: '[DEV] Giả lập thanh toán thành công', bookingId });
};
