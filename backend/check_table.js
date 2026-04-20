const mysql = require('mysql2/promise');
require('dotenv').config();

async function runQuery() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'travel_management'
  });

  try {
    const [columns] = await connection.execute('SHOW COLUMNS FROM system_logs');
    console.log('Columns in system_logs:');
    columns.forEach(c => console.log(`${c.Field} (${c.Type})`));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

runQuery();
