const mysql = require('mysql2/promise');
require('dotenv').config();

async function runUpdates() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'travel_management'
  });

  try {
    const updates = [
      ["UPDATE tours SET status = 'open' WHERE status = 'Đang mở bán'"],
      ["UPDATE tours SET status = 'almost_full' WHERE status = 'Sắp hết chỗ'"],
      ["UPDATE tours SET status = 'closed' WHERE status = 'Đã đóng'"],
      ["UPDATE tours SET status = 'draft' WHERE status = 'Bản nháp'"]
    ];

    for (const [sql] of updates) {
      const [result] = await connection.execute(sql);
      console.log('Executed: ' + sql);
      console.log('Rows affected: ' + result.affectedRows);
    }
  } catch (error) {
    console.error('Error executing updates:', error);
  } finally {
    await connection.end();
  }
}

runUpdates();
