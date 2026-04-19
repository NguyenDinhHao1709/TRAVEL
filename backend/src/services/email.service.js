const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

module.exports = {
  sendMail: async (to, subject, html) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('[Email] EMAIL_USER hoặc EMAIL_PASS chưa cấu hình. Bỏ qua gửi email.');
      return false;
    }
    await transporter.sendMail({
      from: `"HK2 Travel" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    return true;
  }
};
