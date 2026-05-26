// Quick script to get admin email from production DB
process.env.DB_HOST = 'btoa7mylixkz3u9xovei-mysql.services.clever-cloud.com';
process.env.DB_USER = 'uufcauwlliizgsib';
process.env.DB_PASSWORD = 'Tpfcse7wuEUnT4gTB0xH';
process.env.DB_NAME = 'btoa7mylixkz3u9xovei';
process.env.DB_PORT = '3306';
const pool = require('./src/config/db');

async function main() {
  const [admins] = await pool.execute("SELECT id, email, role, full_name, created_at FROM users WHERE role = 'admin'");
  console.log('Admin accounts:', JSON.stringify(admins, null, 2));
  const [staffs] = await pool.execute("SELECT id, email, role, full_name FROM users WHERE role = 'staff'");
  console.log('Staff accounts:', JSON.stringify(staffs, null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
