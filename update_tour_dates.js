// Script cập nhật ngày tour trong Clever Cloud DB
// Chạy: node update_tour_dates.js
const mysql = require('mysql2/promise');

// Điền thông tin Clever Cloud DB ở đây
const config = {
  host: process.env.DB_HOST || 'PASTE_CLEVER_CLOUD_HOST_HERE',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'PASTE_CLEVER_CLOUD_USER_HERE',
  password: process.env.DB_PASSWORD || 'PASTE_CLEVER_CLOUD_PASSWORD_HERE',
  database: process.env.DB_NAME || 'PASTE_CLEVER_CLOUD_DBNAME_HERE',
  ssl: { rejectUnauthorized: false }
};

async function main() {
  const conn = await mysql.createConnection(config);
  console.log('Connected to Clever Cloud MySQL');

  // Kiểm tra tours hiện tại
  const [before] = await conn.execute('SELECT id, title, start_date FROM tours ORDER BY id LIMIT 5');
  console.log('\nTours trước khi update:');
  before.forEach(t => console.log(`  #${t.id} ${t.title} - ${t.start_date}`));

  // Update ngày tour về tương lai
  const [result] = await conn.execute(`
    UPDATE tours 
    SET 
      start_date = DATE_ADD(CURDATE(), INTERVAL (id * 7) DAY),
      end_date   = DATE_ADD(CURDATE(), INTERVAL (id * 7 + 5) DAY)
    WHERE start_date < CURDATE()
  `);
  console.log(`\nĐã update ${result.affectedRows} tours`);

  // Kiểm tra sau update
  const [after] = await conn.execute('SELECT id, title, start_date FROM tours ORDER BY id LIMIT 5');
  console.log('\nTours sau khi update:');
  after.forEach(t => console.log(`  #${t.id} ${t.title} - ${t.start_date}`));

  await conn.end();
  console.log('\nDone!');
}

main().catch(console.error);
