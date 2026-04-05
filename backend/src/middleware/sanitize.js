const xss = require('xss');

const SENSITIVE_FIELDS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'confirmPassword',
  'otpCode',
  'captchaText',
  'captchaToken',
  'registerToken',
  'resetToken'
]);

const sanitizeString = (value) => xss(String(value), {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script']
});

const deepSanitize = (value, key = '') => {
  if (typeof value === 'string') {
    if (SENSITIVE_FIELDS.has(key)) return value;
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepSanitize(item, key));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [childKey, childValue]) => {
      acc[childKey] = deepSanitize(childValue, childKey);
      return acc;
    }, {});
  }

  return value;
};

const sanitizeInput = (req, res, next) => {
  req.body = deepSanitize(req.body);
  req.query = deepSanitize(req.query);
  req.params = deepSanitize(req.params);
  next();
};

module.exports = { sanitizeInput };
