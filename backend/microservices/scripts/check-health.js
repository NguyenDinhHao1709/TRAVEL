require('dotenv').config();
const http = require('http');

const endpointMap = {
  gateway: `http://localhost:${process.env.GATEWAY_PORT || 8080}/api/health`,
  auth: `http://localhost:${process.env.AUTH_SERVICE_PORT || 5001}/api/health`,
  tour: `http://localhost:${process.env.TOUR_SERVICE_PORT || 5002}/api/health`,
  booking: `http://localhost:${process.env.BOOKING_SERVICE_PORT || 5003}/api/health`,
  payment: `http://localhost:${process.env.PAYMENT_SERVICE_PORT || 5004}/api/health`,
  wishlist: `http://localhost:${process.env.WISHLIST_SERVICE_PORT || 5005}/api/health`,
  review: `http://localhost:${process.env.REVIEW_SERVICE_PORT || 5006}/api/health`,
  upload: `http://localhost:${process.env.UPLOAD_SERVICE_PORT || 5007}/api/health`,
  chatbot: `http://localhost:${process.env.CHATBOT_SERVICE_PORT || 5008}/api/health`,
  staff: `http://localhost:${process.env.STAFF_SERVICE_PORT || 5009}/api/health`,
  admin: `http://localhost:${process.env.ADMIN_SERVICE_PORT || 5010}/api/health`,
  fallback: `http://localhost:${process.env.PORT || 5000}/api/health`
};

const checkOne = (name, url) => new Promise((resolve) => {
  const req = http.get(url, { timeout: 4000 }, (res) => {
    const ok = res.statusCode >= 200 && res.statusCode < 300;
    resolve({ name, url, ok, statusCode: res.statusCode });
    res.resume();
  });

  req.on('timeout', () => {
    req.destroy(new Error('timeout'));
  });

  req.on('error', (error) => {
    resolve({ name, url, ok: false, error: error.message });
  });
});

const main = async () => {
  const checks = await Promise.all(Object.entries(endpointMap).map(([name, url]) => checkOne(name, url)));
  const failed = checks.filter((item) => !item.ok);

  for (const item of checks) {
    if (item.ok) {
      console.log(`[OK] ${item.name} (${item.statusCode}) ${item.url}`);
    } else {
      console.log(`[FAIL] ${item.name} ${item.url} ${item.error || item.statusCode}`);
    }
  }

  if (failed.length) {
    process.exitCode = 1;
    return;
  }

  console.log('All microservices are healthy.');
};

main();
