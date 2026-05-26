require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const emailService = require('./src/services/email.service');

console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✓ set' : '✗ missing');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✓ set' : '✗ missing');

async function test() {
  try {
    const result = await emailService.sendMail(
      process.env.EMAIL_USER, // Send to self
      'Test email HK2 Travel',
      '<p>Email test từ backend HK2 Travel. Nếu bạn nhận được email này thì cấu hình email đang hoạt động.</p>'
    );
    console.log('Send result:', result);
  } catch (e) {
    console.error('Send error:', e.message);
  }
  process.exit(0);
}
test();
