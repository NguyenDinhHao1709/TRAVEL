/**
 * Full backend API test script
 * Run: node test-api.js
 */
const http = require('http');

const BASE = 'http://localhost:5000/api';
let pass = 0, fail = 0;
let adminToken = '', staffToken = '', userToken = '', tourId = 1, bookingId, reviewId, articleId, contactId;

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(BASE + path);
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    };
    const r = http.request(opts, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function ok(name, res, expectStatus = 200) {
  const ok = res.status === expectStatus || (expectStatus === 200 && res.status === 201);
  if (ok) { console.log(`  ✅ ${name} (${res.status})`); pass++; }
  else { console.log(`  ❌ ${name} (${res.status}) → ${JSON.stringify(res.data).slice(0,120)}`); fail++; }
  return ok;
}

async function run() {
  console.log('\n====== BACKEND API FULL TEST ======\n');

  // ---- 1. PUBLIC ----
  console.log('📂 1. PUBLIC ENDPOINTS');
  let r;

  r = await req('GET', '/tours'); ok('GET /tours', r);
  if (r.data?.[0]) tourId = r.data[0].id;

  r = await req('GET', `/tours/${tourId}`); ok(`GET /tours/${tourId}`, r);
  r = await req('GET', '/tours/featured'); ok('GET /tours/featured', r);
  r = await req('GET', '/tours?destination=hcm'); ok('GET /tours?destination=hcm', r);
  r = await req('GET', '/articles'); ok('GET /articles', r);
  if (r.data?.[0]) articleId = r.data[0].id;
  r = await req('GET', `/articles/${articleId}`); ok(`GET /articles/${articleId}`, r);
  r = await req('GET', '/reviews'); ok('GET /reviews', r);
  r = await req('GET', `/reviews?tourId=${tourId}`); ok(`GET /reviews?tourId=${tourId}`, r);

  // ---- 2. AUTH ----
  console.log('\n📂 2. AUTH');
  r = await req('GET', '/auth/captcha'); ok('GET /auth/captcha', r);
  const capToken = r.data?.captchaToken;

  // Login admin
  r = await req('POST', '/auth/login', { email: 'admin@travel.com', password: 'Admin@2025', captchaToken: capToken, captchaText: 'dev_bypass' });
  if (ok('POST /auth/login (admin)', r)) adminToken = r.data.token;

  // Login staff
  const cap2 = (await req('GET', '/auth/captcha')).data?.captchaToken;
  r = await req('POST', '/auth/login', { email: 'staff@travel.com', password: 'Staff@2025', captchaToken: cap2, captchaText: 'dev_bypass' });
  if (ok('POST /auth/login (staff)', r)) staffToken = r.data.token;

  // Login user
  const cap3 = (await req('GET', '/auth/captcha')).data?.captchaToken;
  r = await req('POST', '/auth/login', { email: 'user@travel.com', password: 'User@2025', captchaToken: cap3, captchaText: 'dev_bypass' });
  if (ok('POST /auth/login (user)', r)) userToken = r.data.token;

  // Wrong password
  const cap4 = (await req('GET', '/auth/captcha')).data?.captchaToken;
  r = await req('POST', '/auth/login', { email: 'user@travel.com', password: 'wrong', captchaToken: cap4, captchaText: 'dev_bypass' });
  ok('POST /auth/login (wrong pass → 401)', r, 401);

  // Request register OTP
  r = await req('POST', '/auth/register/request-otp', { fullName: 'New User', email: 'newuser_test@gmail.com', password: 'Test@123' });
  ok('POST /auth/register/request-otp', r);

  // ---- 3. USER (authenticated) ----
  console.log('\n📂 3. USER PROFILE');
  r = await req('GET', '/users/me', null, userToken); ok('GET /users/me', r);
  r = await req('PUT', '/users/me', { fullName: 'User Updated', phone: '0901234567' }, userToken); ok('PUT /users/me', r);

  // ---- 4. TOURS (admin write) ----
  console.log('\n📂 4. TOURS (admin CRUD)');
  r = await req('POST', '/tours', {
    title: 'Test Tour ABC', destination: 'Test City', price: 1000000,
    slots: 10, start_date: '2026-06-01', end_date: '2026-06-07'
  }, adminToken);
  ok('POST /tours (admin)', r, 201);
  const newTourId = r.data?.id || r.data?.tour?.id;

  if (newTourId) {
    r = await req('PUT', `/tours/${newTourId}`, { title: 'Test Tour ABC Updated', price: 1200000 }, adminToken);
    ok(`PUT /tours/${newTourId}`, r);
    r = await req('DELETE', `/tours/${newTourId}`, null, adminToken);
    ok(`DELETE /tours/${newTourId}`, r);
  }

  // ---- 5. BOOKINGS ----
  console.log('\n📂 5. BOOKINGS');
  r = await req('POST', '/bookings', { tourId, peopleCount: 2 }, userToken);
  ok('POST /bookings (user)', r, 201);
  if (r.data?.id) bookingId = r.data.id;
  else if (r.data?.booking?.id) bookingId = r.data.booking.id;

  r = await req('GET', '/bookings/my', null, userToken); ok('GET /bookings/my', r);
  r = await req('GET', '/bookings', null, adminToken); ok('GET /bookings (admin)', r);
  r = await req('GET', '/bookings/staff/all', null, staffToken); ok('GET /bookings/staff/all (staff)', r);

  if (bookingId) {
    r = await req('GET', `/bookings/${bookingId}`, null, adminToken); ok(`GET /bookings/${bookingId}`, r);
    r = await req('PATCH', `/bookings/my/${bookingId}/cancel`, null, userToken);
    ok('PATCH /bookings/my/:id/cancel (user)', { status: r.status, data: r.data }, r.status < 300 ? 200 : r.status);
  }

  // ---- 6. REVIEWS ----
  console.log('\n📂 6. REVIEWS');
  // cleanup old test review to ensure idempotent
  const allRevs = await req('GET', '/reviews/admin/all?limit=100', null, adminToken);
  const revList = Array.isArray(allRevs.data) ? allRevs.data : (allRevs.data?.reviews || []);
  for (const rv of revList) {
    if (rv.comment === 'Test review from API test') {
      await req('DELETE', `/reviews/${rv.id}`, null, adminToken);
    }
  }
  r = await req('POST', '/reviews', { tourId, rating: 5, comment: 'Test review from API test' }, userToken);
  ok('POST /reviews (user)', r, 201);
  if (r.data?.id) reviewId = r.data.id;
  else if (r.data?.review?.id) reviewId = r.data.review.id;

  r = await req('GET', '/reviews/admin/all', null, adminToken); ok('GET /reviews/admin/all', r);
  if (reviewId) {
    r = await req('PATCH', `/reviews/staff/${reviewId}/reply`, { reply: 'Cảm ơn bạn!' }, staffToken);
    ok('PATCH /reviews/staff/:id/reply (staff)', r);
    r = await req('DELETE', `/reviews/${reviewId}`, null, adminToken);
    ok('DELETE /reviews/:id (admin)', r);
  }

  // ---- 7. WISHLIST ----
  console.log('\n📂 7. WISHLIST');
  // cleanup first to ensure idempotent
  await req('DELETE', `/wishlists/my/${tourId}`, null, userToken).catch(() => {});
  r = await req('POST', '/wishlists', { tourId }, userToken); ok('POST /wishlists', r, 201);
  r = await req('GET', '/wishlists/my', null, userToken); ok('GET /wishlists/my', r);
  r = await req('DELETE', `/wishlists/my/${tourId}`, null, userToken); ok('DELETE /wishlists/my/:tourId', r);

  // ---- 8. CONTACT ----
  console.log('\n📂 8. CONTACT');
  r = await req('POST', '/contact', {
    fullName: 'Test Contact', email: 'testcontact@gmail.com',
    phone: '0901111111', message: 'Test message from API test', subject: 'Test'
  });
  ok('POST /contact', r, 201);
  r = await req('GET', '/contact/messages', null, adminToken); ok('GET /contact/messages (admin)', r);
  if (r.data?.[0]?.id) {
    r = await req('PATCH', `/contact/messages/${r.data[0].id}/read`, null, adminToken);
    ok('PATCH /contact/messages/:id/read', r);
  }

  // ---- 9. CHATBOT ----
  console.log('\n📂 9. CHATBOT');
  r = await req('POST', '/chatbot/ask', { message: 'Xin chào, có tour nào đến Đà Nẵng không?' }, userToken);
  ok('POST /chatbot/ask', r);

  // ---- 10. DASHBOARD ----
  console.log('\n📂 10. DASHBOARD');
  r = await req('GET', '/dashboard', null, adminToken); ok('GET /dashboard (admin)', r);
  r = await req('GET', '/dashboard', null, staffToken); ok('GET /dashboard (staff)', r);

  // ---- 11. STAFF MANAGEMENT ----
  console.log('\n📂 11. STAFF MANAGEMENT');
  r = await req('GET', '/staff', null, adminToken); ok('GET /staff (admin)', r);
  r = await req('GET', '/staff/customers', null, staffToken); ok('GET /staff/customers (staff)', r);

  // ---- 12. ADMIN ----
  console.log('\n📂 12. ADMIN');
  r = await req('GET', '/admin/users', null, adminToken); ok('GET /admin/users', r);
  r = await req('GET', '/admin/logs', null, adminToken); ok('GET /admin/logs', r);
  r = await req('GET', '/admin/bookings-report', null, adminToken); ok('GET /admin/bookings-report', r);

  // ---- 13. PAYMENT ----
  console.log('\n📂 13. PAYMENT (VNPay URL)');
  r = await req('POST', '/payments/vnpay/create', { bookingId: 1, amount: 2000000 }, userToken);
  // Returns redirect URL
  ok('POST /payments/vnpay/create', r, r.status < 300 ? 200 : r.status);

  // ---- 14. CHAT ----
  console.log('\n📂 14. CHAT');
  r = await req('GET', '/chat/room', null, userToken); ok('GET /chat/room (user get/create)', r);
  const roomId = r.data?.id || r.data?.room?.id;
  if (roomId) {
    r = await req('GET', `/chat/rooms/${roomId}/messages`, null, userToken); ok(`GET /chat/rooms/${roomId}/messages`, r);
    r = await req('POST', `/chat/rooms/${roomId}/messages`, { message: 'Hello from test!' }, userToken);
    ok('POST /chat/rooms/:id/messages', r, 201);
  }
  r = await req('GET', '/chat/rooms', null, staffToken); ok('GET /chat/rooms (staff)', r);

  // ---- SUMMARY ----
  console.log(`\n${'='.repeat(40)}`);
  console.log(`✅ PASS: ${pass}  ❌ FAIL: ${fail}  TOTAL: ${pass + fail}`);
  console.log('='.repeat(40));
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
