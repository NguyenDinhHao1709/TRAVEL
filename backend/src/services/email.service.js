const https = require('https');

// Gửi email qua Brevo HTTP API (tránh SMTP bị chặn trên cloud hosting)
async function sendViaBrevoApi(to, subject, html) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_SMTP_FROM || process.env.EMAIL_USER;
  const payload = JSON.stringify({
    sender: { name: 'HK2 Travel', email: fromEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload)
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Brevo API error ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Brevo API timeout')); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = {
  sendMail: async (to, subject, html) => {
    if (process.env.BREVO_API_KEY) {
      console.log(`[Email] Gửi qua Brevo API tới ${to}`);
      await sendViaBrevoApi(to, subject, html);
      console.log(`[Email] Gửi thành công tới ${to}`);
      return true;
    }
    console.warn('[Email] Chưa cấu hình BREVO_API_KEY. Bỏ qua gửi email.');
    return false;
  }
};
