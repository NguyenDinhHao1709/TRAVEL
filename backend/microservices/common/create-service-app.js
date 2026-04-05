const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { randomUUID } = require('crypto');
const { sanitizeInput } = require('../../src/middleware/sanitize');
const {
  enforceHttps,
  csrfOriginProtection,
  isOriginAllowed
} = require('../../src/middleware/security');

const shouldLogRequests = String(process.env.LOG_REQUESTS || 'true').toLowerCase() !== 'false';

const createServiceApp = () => {
  const app = express();

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

  app.use(enforceHttps);
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  }));
  app.use(express.json());
  app.use(sanitizeInput);
  app.use(csrfOriginProtection);

  return app;
};

module.exports = {
  createServiceApp
};
