const pool = require('../config/db');
const { PayOS } = require('@payos/node');
const emailService = require('../services/email.service');

// Cache lưu dữ liệu payment link (qrCode, bankInfo) theo bookingId
// Tránh mất dữ liệu khi PayOS trả về lỗi 231 (duplicate orderCode)
const paymentLinkCache = new Map(); // bookingId (string) -> { qrCode, checkoutUrl, accountNumber, accountName, bin }

// Đảm bảo cột payos_link_data tồn tại trong bảng bookings (lazy migration)
let payosColumnReady = false;
async function ensurePayosColumn() {
  if (payosColumnReady) return;
  try {
    await pool.execute(
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payos_link_data TEXT DEFAULT NULL`
    );
    payosColumnReady = true;
  } catch (e) {
    // MySQL < 8.0 không hỗ trợ IF NOT EXISTS — thử cách khác
    try {
      await pool.execute(`ALTER TABLE bookings ADD COLUMN payos_link_data TEXT DEFAULT NULL`);
      payosColumnReady = true;
    } catch (_) { /* cột đã tồn tại hoặc không hỗ trợ */ payosColumnReady = true; }
  }
}

// SDK v2: khoi tao lazy de tranh loi khi module duoc require truoc khi dotenv load
let _payos = null;
function getPayOS() {
  if (!_payos) {
    _payos = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
  }
  return _payos;
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '-';
const fmtMoney = (n) => Number(n).toLocaleString('vi-VN') + ' VND';

function buildPaymentConfirmEmail({ bookingId, fullName, tourTitle, startDate, peopleCount, totalAmount, paymentMethod, transactionCode }) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
    <h2 style="color:#198754">HK2 Travel - Thanh toan thanh cong</h2>
    <p>Xin chao${fullName ? ' <strong>' + fullName + '</strong>' : ''},</p>
    <p>Thanh toan cua ban da duoc xac nhan. Chuc ban co chuyen du lich tuyet voi!</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Ma dat tour</strong></td><td style="padding:8px;border:1px solid #dee2e6">#${bookingId}</td></tr>
      <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Tour</strong></td><td style="padding:8px;border:1px solid #dee2e6">${tourTitle}</td></tr>
      <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Ngay khoi hanh</strong></td><td style="padding:8px;border:1px solid #dee2e6">${fmtDate(startDate)}</td></tr>
      <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>So nguoi</strong></td><td style="padding:8px;border:1px solid #dee2e6">${peopleCount}</td></tr>
      <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>So tien da thanh toan</strong></td><td style="padding:8px;border:1px solid #dee2e6"><strong style="color:#198754">${fmtMoney(totalAmount)}</strong></td></tr>
      <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Phuong thuc</strong></td><td style="padding:8px;border:1px solid #dee2e6">${paymentMethod}</td></tr>
      ${transactionCode ? `<tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #dee2e6"><strong>Ma giao dich</strong></td><td style="padding:8px;border:1px solid #dee2e6">${transactionCode}</td></tr>` : ''}
      <tr><td style="padding:8px;border:1px solid #dee2e6"><strong>Trang thai</strong></td><td style="padding:8px;border:1px solid #dee2e6"><span style="color:#198754">Da xac nhan</span></td></tr>
    </table>
    <p style="color:#6c757d;font-size:13px">Email nay duoc gui tu dong, vui long khong tra loi truc tiep.</p>
  </div>`;
}

// --- Tao PayOS payment link ---
exports.createVietQR = async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.body;

  if (!bookingId) return res.status(400).json({ message: 'Thieu bookingId' });

  try {
    const [rows] = await pool.execute(
      `SELECT b.*, t.title AS tour_title FROM bookings b
       LEFT JOIN tours t ON t.id = b.tour_id
       WHERE b.id = ? AND b.user_id = ? LIMIT 1`,
      [bookingId, userId]
    );

    if (!rows.length) return res.status(404).json({ message: 'Khong tim thay don dat tour' });

    const booking = rows[0];
    if (booking.payment_status === 'paid') return res.status(400).json({ message: 'Don da duoc thanh toan' });
    if (booking.booking_status === 'cancelled') return res.status(400).json({ message: 'Don da bi huy' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Đảm bảo cột DB tồn tại
    await ensurePayosColumn();

    // Thử load từ DB trước (cache lâu dài, tồn tại qua server restart)
    let dbCached = null;
    try {
      const [dbRows] = await pool.execute(
        `SELECT payos_link_data FROM bookings WHERE id = ? LIMIT 1`, [bookingId]
      );
      if (dbRows[0]?.payos_link_data) {
        dbCached = JSON.parse(dbRows[0].payos_link_data);
        paymentLinkCache.set(String(bookingId), dbCached); // warm up in-memory cache
      }
    } catch (_) { /* cột chưa tồn tại, bỏ qua */ }

    let paymentLink;
    try {
      // SDK v2: payos.paymentRequests.create()
      paymentLink = await getPayOS().paymentRequests.create({
        orderCode: Number(bookingId),
        amount: Number(booking.total_amount),
        description: `HK2 ${bookingId}`,
        returnUrl: `${frontendUrl}/payment-return`,
        cancelUrl: `${frontendUrl}/payment-return`,
      });

      // Lưu cache khi tạo thành công để dùng lại khi bị duplicate
      const cacheData = {
        qrCode:        paymentLink.qrCode,
        checkoutUrl:   paymentLink.checkoutUrl,
        accountNumber: paymentLink.accountNumber,
        accountName:   paymentLink.accountName,
        bin:           paymentLink.bin,
      };
      paymentLinkCache.set(String(bookingId), cacheData);
      // Lưu vào DB để tồn tại qua server restart
      try {
        await pool.execute(
          `UPDATE bookings SET payos_link_data = ? WHERE id = ?`,
          [JSON.stringify(cacheData), bookingId]
        );
      } catch (_) { /* bỏ qua nếu cột chưa tồn tại */ }

    } catch (err) {
      const msg = err.message || '';
      // PayOS code 231 = "Đơn thanh toán đã tồn tại" — lấy link hiện có
      const isDuplicate = msg.includes('231') || msg.includes('tồn tại') || msg.includes('duplicate') || msg.includes('DUPLICATE');
      if (isDuplicate) {
        // Thử lấy từ cache trước (đầy đủ thông tin)
        const cached = paymentLinkCache.get(String(bookingId));
        if (cached) {
          paymentLink = cached;
        } else {
          // Fallback: gọi PayOS .get() (chỉ trả về checkoutUrl, không có QR/bankInfo)
          try {
            const info = await getPayOS().paymentRequests.get(Number(bookingId));
            if (info.status === 'PAID') {
              await pool.execute(
                `UPDATE bookings SET payment_status = 'paid', booking_status = 'confirmed',
                 payment_method = 'payos', updated_at = NOW() WHERE id = ? AND payment_status != 'paid'`,
                [bookingId]
              );
              return res.status(400).json({ message: 'Don da duoc thanh toan' });
            }
            paymentLink = {
              qrCode:        null,
              checkoutUrl:   info.checkoutUrl || null,
              accountNumber: null,
              accountName:   null,
              bin:           null,
            };
          } catch (e2) {
            console.error('[PayOS] Loi lay payment link:', e2.message);
            return res.status(500).json({ message: 'Khong the tao link thanh toan. Vui long thu lai.' });
          }
        }
      } else {
        console.error('[PayOS] Loi tao payment link:', msg);
        return res.status(500).json({ message: 'Khong the ket noi PayOS. Vui long thu lai.' });
      }
    }

    res.json({
      qrCode: paymentLink.qrCode,
      checkoutUrl: paymentLink.checkoutUrl,
      transferContent: `HK2 ${bookingId}`,
      amount: Number(booking.total_amount),
      accountNo: paymentLink.accountNumber,
      accountName: paymentLink.accountName,
      bankId: paymentLink.bin,
      bookingId: String(bookingId),
      tourTitle: booking.tour_title,
    });
  } catch (err) {
    console.error('[createVietQR] Loi:', err.message);
    res.status(500).json({ message: 'Loi he thong, vui long thu lai.' });
  }
};

// --- Kiem tra trang thai thanh toan ---
exports.checkPaymentStatus = async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.params;

  const [rows] = await pool.execute(
    'SELECT payment_status, booking_status FROM bookings WHERE id = ? AND user_id = ? LIMIT 1',
    [bookingId, userId]
  );

  if (!rows.length) return res.status(404).json({ message: 'Khong tim thay don' });
  res.json(rows[0]);
};

// --- Webhook tu PayOS ---
exports.sePayWebhook = async (req, res) => {
  // Tra 200 ngay lap tuc
  res.json({ success: true });

  let webhookData;
  try {
    // SDK v2: payos.webhooks.verify(body)
    webhookData = await getPayOS().webhooks.verify(req.body);
  } catch (err) {
    console.warn('[PayOS Webhook] Xac thuc that bai:', err.message);
    return;
  }

  console.log('[PayOS Webhook] Nhan duoc:', JSON.stringify(webhookData));

  // Kiem tra code thanh cong
  if (webhookData.code !== '00') {
    console.log('[PayOS Webhook] Giao dich khong thanh cong, code:', webhookData.code);
    return;
  }

  const bookingId = webhookData.data ? webhookData.data.orderCode : webhookData.orderCode;
  const paidAmount = webhookData.data ? webhookData.data.amount : webhookData.amount;
  const reference = (webhookData.data ? webhookData.data.reference : webhookData.reference) || '';

  if (!bookingId) {
    console.warn('[PayOS Webhook] Khong co orderCode trong webhook data');
    return;
  }

  const [rows] = await pool.execute(
    `SELECT b.*, t.title, t.start_date, u.email, u.full_name
     FROM bookings b
     LEFT JOIN tours t ON t.id = b.tour_id
     LEFT JOIN users u ON u.id = b.user_id
     WHERE b.id = ? LIMIT 1`,
    [bookingId]
  );

  if (!rows.length) {
    console.log('[PayOS Webhook] Khong tim thay booking #' + bookingId);
    return;
  }

  const booking = rows[0];
  if (booking.payment_status === 'paid') return;

  await pool.execute(
    `UPDATE bookings SET payment_status = 'paid', booking_status = 'confirmed',
     payment_method = 'payos', updated_at = NOW() WHERE id = ?`,
    [bookingId]
  );

  console.log('[PayOS Webhook] Booking #' + bookingId + ' da thanh toan: ' + paidAmount + ' VND | ref: ' + reference);

  emailService.sendMail(
    booking.email,
    'Thanh toan thanh cong - ' + booking.title,
    buildPaymentConfirmEmail({
      bookingId,
      fullName: booking.full_name,
      tourTitle: booking.title,
      startDate: booking.start_date,
      peopleCount: booking.people_count,
      totalAmount: booking.total_amount,
      paymentMethod: 'PayOS (Chuyen khoan ngan hang)',
      transactionCode: reference,
    })
  ).catch(() => {});
};
