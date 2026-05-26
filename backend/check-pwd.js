// Test admin password options
process.env.DB_HOST = 'btoa7mylixkz3u9xovei-mysql.services.clever-cloud.com';
process.env.DB_USER = 'uufcauwlliizgsib';
process.env.DB_PASSWORD = 'Tpfcse7wuEUnT4gTB0xH';
process.env.DB_NAME = 'btoa7mylixkz3u9xovei';
process.env.DB_PORT = '3306';
const pool = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function main() {
  const [rows] = await pool.execute("SELECT id, email, password, role FROM users WHERE role = 'admin' LIMIT 1");
  const admin = rows[0];
  console.log('Admin email:', admin.email);
  
  const passwords = ['Admin@2025', 'Admin@123', 'admin123', 'Admin123', 'admin@2025'];
  for (const p of passwords) {
    const match = await bcrypt.compare(p, admin.password);
    console.log(`  Password "${p}" matches:`, match);
    if (match) break;
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
