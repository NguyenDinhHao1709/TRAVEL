const nodemailer = require('nodemailer');

// Hỗ trợ cả Brevo (BREVO_SMTP_*) và Gmail fallback
const smtpConfig = process.env.BREVO_SMTP_HOST
  ? {
      host: process.env.BREVO_SMTP_HOST,      // smtp-relay.brevo.com
      port: Number(process.env.BREVO_SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS
      }
    }
  : {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };

const transporter = nodemailer.createTransport({
  ...smtpConfig,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000
});

const fromAddress = process.env.BREVO_SMTP_FROM || process.env.EMAIL_USER;

module.exports = {
  sendMail: async (to, subject, html) => {
    const hasBrevo = process.env.BREVO_SMTP_HOST && process.env.BREVO_SMTP_PASS;
    const hasGmail = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    if (!hasBrevo && !hasGmail) {
      console.warn('[Email] Chưa cấu hình email. Bỏ qua gửi email.');
      return false;
    }
    await transporter.sendMail({
      from: `"HK2 Travel" <${fromAddress}>`,
      to,
      subject,
      html
    });
    return true;
  }
};
