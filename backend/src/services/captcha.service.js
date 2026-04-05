const crypto = require('crypto');

const CAPTCHA_TTL_MS = 2 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 30 * 1000;
const captchaStore = new Map();
let lastCleanupAt = 0;

const cleanupExpired = (force = false) => {
  const now = Date.now();
  if (!force && now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }
  lastCleanupAt = now;

  for (const [token, item] of captchaStore.entries()) {
    if (item.expiresAt <= now) {
      captchaStore.delete(token);
    }
  }
};

const createCaptchaText = (length = 5) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const createCaptchaSvg = (text) => `
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="52" viewBox="0 0 160 52">
  <rect width="160" height="52" fill="#f3f4f6" rx="8" />
  <line x1="8" y1="12" x2="150" y2="40" stroke="#cbd5e1" stroke-width="1.5" />
  <line x1="18" y1="44" x2="145" y2="10" stroke="#d1d5db" stroke-width="1.5" />
  <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="28" letter-spacing="4" fill="#1f2937" font-weight="700">${text}</text>
</svg>`;

const generateCaptcha = () => {
  cleanupExpired();

  const token = crypto.randomUUID();
  const text = createCaptchaText(5);

  captchaStore.set(token, {
    answer: text,
    expiresAt: Date.now() + CAPTCHA_TTL_MS
  });

  return {
    captchaToken: token,
    captchaSvg: createCaptchaSvg(text),
    expiresInSeconds: Math.floor(CAPTCHA_TTL_MS / 1000)
  };
};

const verifyCaptcha = ({ token, input }) => {
  cleanupExpired();

  const saved = captchaStore.get(String(token || ''));
  if (!saved) return false;

  captchaStore.delete(String(token || ''));

  const normalizedInput = String(input || '').trim().toUpperCase();
  return normalizedInput.length > 0 && normalizedInput === saved.answer;
};

module.exports = {
  generateCaptcha,
  verifyCaptcha
};
