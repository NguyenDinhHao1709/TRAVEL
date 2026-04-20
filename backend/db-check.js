const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkStatus() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'travel_management'
  });

  try {
    const [rows] = await connection.execute('SELECT DISTINCT status FROM tours');
    console.log('Current statuses in database:');
    console.log(rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkStatus();
