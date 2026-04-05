const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

const parseAllowedOrigins = () => {
  const envOrigins = String(process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const merged = [...DEFAULT_ORIGINS, ...envOrigins];
  return new Set(merged);
};

const allowedOrigins = parseAllowedOrigins();

const normalizeOrigin = (origin) => {
  try {
    return new URL(origin).origin;
  } catch {
    return '';
  }
};

const isOriginAllowed = (origin) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return allowedOrigins.has(normalized);
};

const enforceHttps = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  const isSecure = req.secure || forwardedProto === 'https';

  if (isSecure) return next();

  const host = req.get('host');
  return res.redirect(301, `https://${host}${req.originalUrl}`);
};

const EXCLUDED_CSRF_PATHS = [
  '/api/payments/momo/ipn'
];

const csrfOriginProtection = (req, res, next) => {
  const method = String(req.method || '').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (!isMutating) return next();

  if (EXCLUDED_CSRF_PATHS.some((path) => req.path.startsWith(path))) {
    return next();
  }

  const origin = req.get('origin');

  if (!origin) {
    if (process.env.NODE_ENV !== 'production') return next();
    return res.status(403).json({ message: 'Forbidden: Missing request origin' });
  }

  if (!isOriginAllowed(origin)) {
    return res.status(403).json({ message: 'Forbidden: Invalid request origin' });
  }

  return next();
};

module.exports = {
  allowedOrigins,
  isOriginAllowed,
  enforceHttps,
  csrfOriginProtection
};
