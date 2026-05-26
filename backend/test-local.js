const jwt = require('./src/utils/jwt');
const http = require('http');

const token = jwt.sign({ id: 1, role: 'admin', email: 'admin@test.com' });

function request(path) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: 5555,
      path,
      headers: { Authorization: `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data.substring(0, 400) }));
    }).on('error', reject);
  });
}

async function test() {
  const endpoints = [
    '/api/admin/users?page=1&limit=5',
    '/api/admin/system-logs?page=1&limit=5',
    '/api/reviews/admin/all?page=1&limit=5',
    '/api/contact/messages?page=1&limit=5',
  ];
  for (const ep of endpoints) {
    try {
      const r = await request(ep);
      console.log(`${r.status} ${ep}\n  ${r.body.replace(/\n/g, ' ')}\n`);
    } catch(e) { console.error(ep, 'ERROR:', e.message); }
  }
  process.exit(0);
}
test();
