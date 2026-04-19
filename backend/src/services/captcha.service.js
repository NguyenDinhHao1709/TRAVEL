const svgCaptcha = require('svg-captcha');
const crypto = require('crypto');

// In-memory store (sản xuất nên dùng Redis)
const captchaStore = new Map();
const CAPTCHA_TTL = 5 * 60 * 1000; // 5 phút

// Dọn sạch các captcha hết hạn mỗi phút
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of captchaStore.entries()) {
    if (entry.expiresAt < now) captchaStore.delete(token);
  }
}, 60 * 1000);

module.exports = {
  generate: () => {
    const captcha = svgCaptcha.create({
      size: 5,
      noise: 2,
      color: true,
      background: '#f0f0f0'
    });
    const token = crypto.randomBytes(16).toString('hex');
    captchaStore.set(token, {
      text: captcha.text.toLowerCase(),
      expiresAt: Date.now() + CAPTCHA_TTL
    });
    return { captchaToken: token, captchaSvg: captcha.data };
  },

  verify: (token, input) => {
    // Dev-only bypass for automated testing
    if (process.env.NODE_ENV !== 'production' && String(input || '').toLowerCase().trim() === 'dev_bypass') {
      captchaStore.delete(token);
      return true;
    }
    const entry = captchaStore.get(String(token || ''));
    if (!entry) return false;
    captchaStore.delete(token);
    if (entry.expiresAt < Date.now()) return false;
    return entry.text === String(input || '').toLowerCase().trim();
  }
};
