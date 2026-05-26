const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: { user: 'ac712a001@smtp-brevo.com', pass: 'HILDBOURjmfxF1kN' },
  connectionTimeout: 15000,
  socketTimeout: 15000
});

transporter.sendMail({
  from: '"HK2 Travel" <nguyendinhhao170909@gmail.com>',
  to: 'nguyendinhhao170909@gmail.com',
  subject: 'Test Brevo SMTP - HK2 Travel',
  html: '<p>Email test từ Brevo SMTP. Nếu nhận được email này thì Brevo hoạt động tốt!</p>'
}).then(r => {
  console.log('✅ Gửi email thành công! messageId:', r.messageId);
}).catch(e => {
  console.error('❌ Gửi email thất bại:', e.message);
  if (e.response) console.error('SMTP response:', e.response);
});
