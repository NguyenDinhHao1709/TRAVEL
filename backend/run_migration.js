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
    const columnNames = columns.map(c => c.Field);
    console.log('Current columns:', columnNames);

    let query = "ALTER TABLE system_logs ";
    const additions = [];
    
    if (!columnNames.includes('ip_address')) {
      additions.push("ADD COLUMN ip_address VARCHAR(45) NULL AFTER user_id");
    }
    if (!columnNames.includes('details')) {
      // Find where to put 'details'
      let after = columnNames.includes('action_detail') ? 'action_detail' : 
                   (columnNames.includes('details_text') ? 'details_text' : 
                   (columnNames.includes('action') ? 'action' : 'user_id'));
      additions.push(`ADD COLUMN details JSON NULL AFTER ${after}`);
    }

    if (additions.length > 0) {
      query += additions.join(", ");
      console.log('Executing:', query);
      await connection.execute(query);
      console.log('Migration successful!');
    } else {
      console.log('Columns already exist.');
    }
  } catch (error) {
    console.error('Error executing query:', error.message);
  } finally {
    await connection.end();
  }
}

runQuery();
