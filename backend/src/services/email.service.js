const nodemailer = require('nodemailer');

const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
let cachedTransporter = null;

const validateMailerConfig = () => {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Thiếu cấu hình SMTP: ${missing.join(', ')}`);
  }
};

const createTransporter = () => {
  validateMailerConfig();

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const getTransporter = () => {
  if (!cachedTransporter) {
    cachedTransporter = createTransporter();
  }
  return cachedTransporter;
};

const sendResetPasswordEmail = async ({ toEmail, fullName, tempPassword }) => {
  const transporter = getTransporter();

  const subject = 'HK2 Travel - Mật khẩu mới của bạn';
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2 style="margin-bottom:8px">Xin chào ${fullName || 'bạn'},</h2>
      <p>Quản trị viên đã reset mật khẩu tài khoản của bạn trên hệ thống <strong>HK2 Travel</strong>.</p>
      <p>Mật khẩu tạm thời mới của bạn là:</p>
      <p style="font-size:20px;font-weight:700;color:#0d47a1;letter-spacing:0.5px">${tempPassword}</p>
      <p>Vui lòng đăng nhập và đổi mật khẩu ngay để đảm bảo an toàn.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0" />
      <p style="font-size:12px;color:#6b7280">Email này được gửi tự động từ hệ thống HK2 Travel.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject,
    html
  });
};

const sendRegisterOtpEmail = async ({ toEmail, fullName, otpCode }) => {
  const transporter = getTransporter();

  const subject = 'HK2 Travel - Mã xác nhận đăng ký';
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2 style="margin-bottom:8px">Xin chào ${fullName || 'bạn'},</h2>
      <p>Bạn đang thực hiện đăng ký tài khoản trên <strong>HK2 Travel</strong>.</p>
      <p>Mã xác nhận (OTP) của bạn là:</p>
      <p style="font-size:24px;font-weight:700;color:#0d47a1;letter-spacing:4px">${otpCode}</p>
      <p>Mã có hiệu lực trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0" />
      <p style="font-size:12px;color:#6b7280">Email này được gửi tự động từ hệ thống HK2 Travel.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject,
    html
  });
};

const sendForgotPasswordOtpEmail = async ({ toEmail, fullName, otpCode }) => {
  const transporter = getTransporter();

  const subject = 'HK2 Travel - Mã OTP đặt lại mật khẩu';
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2 style="margin-bottom:8px">Xin chào ${fullName || 'bạn'},</h2>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu tài khoản trên <strong>HK2 Travel</strong>.</p>
      <p>Mã OTP để tạo mật khẩu mới là:</p>
      <p style="font-size:24px;font-weight:700;color:#0d47a1;letter-spacing:4px">${otpCode}</p>
      <p>Mã có hiệu lực trong <strong>5 phút</strong>. Nếu không phải bạn thực hiện, vui lòng bỏ qua email này.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0" />
      <p style="font-size:12px;color:#6b7280">Email này được gửi tự động từ hệ thống HK2 Travel.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject,
    html
  });
};

const formatDate = (val) => {
  if (!val) return 'N/A';
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatMoney = (val) =>
  Number(val).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const sendPaymentSuccessEmail = async ({ toEmail, fullName, tourTitle, departureDate, endDate, peopleCount, totalAmount, bookingId }) => {
  const transporter = getTransporter();
  const subject = `HK2 Travel - Thanh toán thành công booking #${bookingId}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#111827;max-width:560px">
      <h2 style="color:#16a34a">Thanh toán thành công!</h2>
      <p>Xin chào <strong>${fullName || 'bạn'}</strong>,</p>
      <p>Chúng tôi xác nhận bạn đã thanh toán thành công cho booking sau:</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px;background:#f3f4f6;font-weight:600">Mã booking</td><td style="padding:8px">#${bookingId}</td></tr>
        <tr><td style="padding:8px;background:#f3f4f6;font-weight:600">Tour</td><td style="padding:8px">${tourTitle}</td></tr>
        <tr><td style="padding:8px;background:#f3f4f6;font-weight:600">Ngày khởi hành</td><td style="padding:8px">${formatDate(departureDate)}</td></tr>
        ${endDate ? `<tr><td style="padding:8px;background:#f3f4f6;font-weight:600">Ngày kết thúc</td><td style="padding:8px">${formatDate(endDate)}</td></tr>` : ''}
        <tr><td style="padding:8px;background:#f3f4f6;font-weight:600">Số người</td><td style="padding:8px">${peopleCount}</td></tr>
        <tr><td style="padding:8px;background:#f3f4f6;font-weight:600">Tổng tiền đã trả</td><td style="padding:8px;color:#16a34a;font-weight:700">${formatMoney(totalAmount)}</td></tr>
        <tr><td style="padding:8px;background:#f3f4f6;font-weight:600">Trạng thái</td><td style="padding:8px;color:#16a34a;font-weight:700">✅ Đã xác nhận</td></tr>
      </table>
      <p>Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của <strong>HK2 Travel</strong>. Chúc bạn có chuyến đi vui vẻ!</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0" />
      <p style="font-size:12px;color:#6b7280">Email này được gửi tự động từ hệ thống HK2 Travel.</p>
    </div>
  `;
  await transporter.sendMail({ from: process.env.SMTP_FROM, to: toEmail, subject, html });
};

const sendBookingCancelledEmail = async ({ toEmail, fullName, tourTitle, bookingId, reason }) => {
  const transporter = getTransporter();
  const subject = `HK2 Travel - Thông báo hủy booking #${bookingId}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#111827;max-width:560px">
      <h2 style="color:#dc2626">Booking đã bị hủy</h2>
      <p>Xin chào <strong>${fullName || 'bạn'}</strong>,</p>
      <p>Booking <strong>#${bookingId}</strong> cho tour <strong>${tourTitle}</strong> đã bị hủy.</p>
      ${reason ? `<p><strong>Lý do:</strong> ${reason}</p>` : ''}
      <p>Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi qua trang Liên hệ.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0" />
      <p style="font-size:12px;color:#6b7280">Email này được gửi tự động từ hệ thống HK2 Travel.</p>
    </div>
  `;
  await transporter.sendMail({ from: process.env.SMTP_FROM, to: toEmail, subject, html });
};

const sendBookingConfirmedEmail = async ({ toEmail, fullName, tourTitle, departureDate, bookingId }) => {
  const transporter = getTransporter();
  const subject = `HK2 Travel - Booking #${bookingId} đã được xác nhận`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#111827;max-width:560px">
      <h2 style="color:#16a34a">Booking đã được xác nhận!</h2>
      <p>Xin chào <strong>${fullName || 'bạn'}</strong>,</p>
      <p>Nhân viên của <strong>HK2 Travel</strong> đã xác nhận booking <strong>#${bookingId}</strong> cho tour <strong>${tourTitle}</strong>.</p>
      <p><strong>Ngày khởi hành:</strong> ${formatDate(departureDate)}</p>
      <p>Chúc bạn có một chuyến đi thật vui vẻ và ý nghĩa!</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0" />
      <p style="font-size:12px;color:#6b7280">Email này được gửi tự động từ hệ thống HK2 Travel.</p>
    </div>
  `;
  await transporter.sendMail({ from: process.env.SMTP_FROM, to: toEmail, subject, html });
};

module.exports = {
  sendRegisterOtpEmail,
  sendForgotPasswordOtpEmail,
  sendResetPasswordEmail,
  sendPaymentSuccessEmail,
  sendBookingCancelledEmail,
  sendBookingConfirmedEmail
};
