/**
 * Giả lập SePay webhook cho một booking cụ thể
 * Usage: node sim-pay.js <bookingId>
 */
const http = require('http');
const crypto = require('crypto');
const mysql = require('./backend/node_modules/mysql2/promise');
const dotenv = require('./backend/node_modules/dotenv');

const bookingId = process.argv[2];
if (!bookingId) { console.error('Usage: node sim-pay.js <bookingId>'); process.exit(1); }

dotenv.config({ path: __dirname + '/backend/.env' });

const apiKey      = (process.env.SEPAY_APIKEY || '').trim();
const checksumKey = (process.env.SEPAY_CHECKSUM_KEY || '').trim();

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'travel_management',
  });

  const [[booking]] = await pool.execute(
    'SELECT id, total_amount, payment_status FROM bookings WHERE id = ? LIMIT 1',
    [bookingId]
  );

  if (!booking) { console.error(`Không tìm thấy booking #${bookingId}`); process.exit(1); }
  if (booking.payment_status === 'paid') {
    console.log(`✅ Booking #${bookingId} đã được thanh toán trước đó.`);
    process.exit(0);
  }

  const content       = `HK2 ${bookingId}`;
  const transferAmount = String(booking.total_amount);
  const referenceCode  = `SIM${Date.now()}`;
  const raw = `${apiKey}${content}${transferAmount}${referenceCode}${checksumKey}`;
  const signature = crypto.createHash('sha256').update(raw).digest('hex');

  const body = JSON.stringify({
    content, transferAmount: Number(transferAmount),
    transferType: 'in', referenceCode, signature,
  });

  console.log(`📤 Giả lập thanh toán booking #${bookingId}, amount=${transferAmount} VND`);

  const req = http.request({
    hostname: 'localhost', port: 5000,
    path: '/api/payments/webhook/sepay',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      if (res.statusCode === 200 && JSON.parse(data).success) {
        console.log(`🎉 Booking #${bookingId} đã xác nhận thanh toán thành công!`);
      } else {
        console.error(`❌ Response ${res.statusCode}:`, data);
      }
      process.exit(0);
    });
  });
  req.on('error', e => { console.error('Lỗi kết nối:', e.message); process.exit(1); });
  req.write(body);
  req.end();
  await pool.end();
})();
