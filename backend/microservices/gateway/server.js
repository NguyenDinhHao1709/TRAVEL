require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const { randomUUID } = require('crypto');
const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = Number(process.env.GATEWAY_PORT || 8080);

const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const tourServiceUrl = process.env.TOUR_SERVICE_URL || 'http://localhost:5002';
const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:5003';
const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004';
const wishlistServiceUrl = process.env.WISHLIST_SERVICE_URL || 'http://localhost:5005';
const reviewServiceUrl = process.env.REVIEW_SERVICE_URL || 'http://localhost:5006';
const uploadServiceUrl = process.env.UPLOAD_SERVICE_URL || 'http://localhost:5007';
const chatbotServiceUrl = process.env.CHATBOT_SERVICE_URL || 'http://localhost:5008';
const staffServiceUrl = process.env.STAFF_SERVICE_URL || 'http://localhost:5009';
const adminServiceUrl = process.env.ADMIN_SERVICE_URL || 'http://localhost:5010';
const monolithFallbackUrl = process.env.MONOLITH_FALLBACK_URL || 'http://localhost:5000';
const shouldLogRequests = String(process.env.LOG_REQUESTS || 'true').toLowerCase() !== 'false';
const cacheTtlMs = Number(process.env.GATEWAY_CACHE_TTL_MS || 15000);
const responseCache = new Map();

const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message }
});

const authLimiter = createLimiter(60 * 1000, 40, 'Too many auth requests, please try again later');
const writeLimiter = createLimiter(60 * 1000, 120, 'Too many write requests, please try again later');

const isCacheableRequest = (req) => {
  if (req.method !== 'GET') return false;
  if (req.path.startsWith('/api/tours')) return true;
  if (req.path.startsWith('/api/articles')) return true;
  if (req.path.startsWith('/api/reviews/tour/')) return true;
  return false;
};

const getCacheTarget = (req) => {
  if (req.path.startsWith('/api/tours')) return tourServiceUrl;
  if (req.path.startsWith('/api/articles')) return monolithFallbackUrl;
  if (req.path.startsWith('/api/reviews/tour/')) return reviewServiceUrl;
  return null;
};

const cacheMiddleware = async (req, res, next) => {
  if (!isCacheableRequest(req)) return next();

  const key = `${req.method}:${req.originalUrl}`;
  const cached = responseCache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    res.setHeader('x-cache', 'HIT');
    return res.status(cached.status).json(cached.body);
  }

  const target = getCacheTarget(req);
  if (!target) return next();

  try {
    const upstream = await axios.get(`${target}${req.originalUrl}`, {
      timeout: 10000,
      headers: {
        authorization: req.get('authorization') || undefined,
        'x-request-id': req.requestId
      }
    });

    responseCache.set(key, {
      status: upstream.status,
      body: upstream.data,
      expiresAt: now + cacheTtlMs
    });

    res.setHeader('x-cache', 'MISS');
    return res.status(upstream.status).json(upstream.data);
  } catch (error) {
    const status = error.response?.status || 502;
    const body = error.response?.data || { message: 'Bad gateway', target };
    return res.status(status).json(body);
  }
};

const serviceRoutes = [
  { mount: '/api/auth', prefix: '/api/auth', target: authServiceUrl },
  { mount: '/api/tours', prefix: '/api/tours', target: tourServiceUrl },
  { mount: '/api/bookings', prefix: '/api/bookings', target: bookingServiceUrl },
  { mount: '/api/payments', prefix: '/api/payments', target: paymentServiceUrl },
  { mount: '/api/wishlists', prefix: '/api/wishlists', target: wishlistServiceUrl },
  { mount: '/api/reviews', prefix: '/api/reviews', target: reviewServiceUrl },
  { mount: '/api/upload', prefix: '/api/upload', target: uploadServiceUrl },
  { mount: '/api/chatbot', prefix: '/api/chatbot', target: chatbotServiceUrl },
  { mount: '/api/staff', prefix: '/api/staff', target: staffServiceUrl },
  { mount: '/api/admin', prefix: '/api/admin', target: adminServiceUrl },
  { mount: '/api', prefix: '/api', target: monolithFallbackUrl },
  { mount: '/uploads', prefix: '/uploads', target: monolithFallbackUrl }
];

const proxyOptions = (target, prefix) => ({
  target,
  changeOrigin: true,
  ws: true,
  timeout: 10000,
  proxyTimeout: 10000,
  pathRewrite: (path) => `${prefix}${path}`,
  onError: (error, req, res) => {
    console.error(`[${req.requestId || 'n/a'}] Gateway proxy error to ${target}:`, error.message);
    res.status(502).json({ message: 'Bad gateway', target });
  }
});

app.use((req, res, next) => {
  req.requestId = req.get('x-request-id') || randomUUID();
  res.setHeader('x-request-id', req.requestId);

  if (!shouldLogRequests) return next();

  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.log(`[${req.requestId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
  });

  next();
});

app.use('/api/auth', authLimiter);
app.use(['/api/bookings', '/api/payments', '/api/upload', '/api/admin', '/api/staff'], writeLimiter);
app.use(cacheMiddleware);

app.get('/api/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'ok',
    routes: {
      auth: authServiceUrl,
      tours: tourServiceUrl,
      bookings: bookingServiceUrl,
      payments: paymentServiceUrl,
      wishlists: wishlistServiceUrl,
      reviews: reviewServiceUrl,
      upload: uploadServiceUrl,
      chatbot: chatbotServiceUrl,
      staff: staffServiceUrl,
      admin: adminServiceUrl,
      fallback: monolithFallbackUrl
    }
  });
});

for (const route of serviceRoutes) {
  app.use(route.mount, createProxyMiddleware(proxyOptions(route.target, route.prefix)));
}

app.listen(port, () => {
  console.log(`api-gateway running at http://localhost:${port}`);
});
