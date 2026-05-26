require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const jwt = require('./src/utils/jwt');
const https = require('https');

// Create an admin token
const token = jwt.sign({ id: 1, role: 'admin', email: 'test@test.com' });
console.log('Token:', token.substring(0, 50) + '...');

const BACKEND = 'https://travel-management-backend-b4pr.onrender.com';

function request(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND + path);
    https.get({
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: { Authorization: `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data.substring(0, 300) }));
    }).on('error', reject);
  });
}

async function test() {
  const endpoints = [
    '/api/admin/users?page=1&limit=5',
    '/api/admin/system-logs?page=1&limit=5',
    '/api/admin/dashboard',
    '/api/reviews/admin/all?page=1&limit=5',
    '/api/contact/messages?page=1&limit=5',
    '/api/bookings/staff/all',
    '/api/staff/customers',
  ];
  for (const ep of endpoints) {
    try {
      const r = await request(ep);
      console.log(`${r.status} ${ep} → ${r.body.replace(/\n/g, ' ')}`);
    } catch(e) { console.error(ep, 'ERROR:', e.message); }
  }
  process.exit(0);
}
test();
