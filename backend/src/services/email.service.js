const nodemailer = require('nodemailer');

// Tạo transporter mỗi lần gửi để đảm bảo đọc env vars mới nhất
function createTransporter() {
  const hasBrevo = process.env.BREVO_SMTP_HOST && process.env.BREVO_SMTP_PASS;
  if (hasBrevo) {
    console.log('[Email] Dùng Brevo SMTP:', process.env.BREVO_SMTP_HOST);
    return nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: Number(process.env.BREVO_SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000
    });
  }
  const hasGmail = process.env.EMAIL_USER && process.env.EMAIL_PASS;
  if (hasGmail) {
    console.log('[Email] Dùng Gmail SMTP:', process.env.EMAIL_USER);
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000
    });
  }
  return null;
}

module.exports = {
  sendMail: async (to, subject, html) => {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn('[Email] Chưa cấu hình email. Bỏ qua gửi email.');
      return false;
    }
    const fromAddress = process.env.BREVO_SMTP_FROM || process.env.EMAIL_USER;
    await transporter.sendMail({
      from: `"HK2 Travel" <${fromAddress}>`,
      to,
      subject,
      html
    });
    console.log(`[Email] Gửi thành công tới ${to}`);
    return true;
  }
};
