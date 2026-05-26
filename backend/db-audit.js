require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const pool = require('./src/config/db');

async function test() {
  try {
    const [[usersCount]] = await pool.execute("SELECT COUNT(*) as cnt FROM users WHERE role != 'admin'");
    console.log('Users (non-admin):', usersCount.cnt);

    const [[reviewsCount]] = await pool.execute('SELECT COUNT(*) as cnt FROM reviews');
    console.log('Reviews:', reviewsCount.cnt);

    const [[contactCount]] = await pool.execute('SELECT COUNT(*) as cnt FROM contact_messages');
    console.log('Contact messages:', contactCount.cnt);

    const [[logsCount]] = await pool.execute('SELECT COUNT(*) as cnt FROM system_logs');
    console.log('System logs:', logsCount.cnt);

    const [[bookingsCount]] = await pool.execute('SELECT COUNT(*) as cnt FROM bookings');
    console.log('Bookings:', bookingsCount.cnt);

    const [bookingCols] = await pool.execute('SHOW COLUMNS FROM bookings');
    console.log('Bookings columns:', bookingCols.map(c => c.Field).join(', '));

    const [logCols] = await pool.execute('SHOW COLUMNS FROM system_logs');
    console.log('system_logs columns:', logCols.map(c => c.Field).join(', '));

    // Test admin getUsers query directly
    const [users] = await pool.execute(
      "SELECT id, full_name, email, role, phone, is_locked, must_change_password, created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC LIMIT 5 OFFSET 0"
    );
    console.log('Users sample:', JSON.stringify(users.slice(0,2), null, 2));

    // Test system_logs getSystemLogs query
    const [[{total}]] = await pool.execute('SELECT COUNT(*) as total FROM system_logs WHERE 1=1');
    const [logs] = await pool.execute(
      `SELECT l.*, u.full_name as user_name, u.email as user_email
       FROM system_logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE 1=1
       ORDER BY l.created_at DESC LIMIT 10 OFFSET 0`
    );
    console.log('Logs total:', total, 'sample count:', logs.length);
    if (logs.length > 0) console.log('First log:', JSON.stringify(logs[0], null, 2));

    // Test reviews/admin/all
    const [[{total: rTotal}]] = await pool.execute('SELECT COUNT(*) as total FROM reviews r LEFT JOIN users u ON u.id = r.user_id WHERE 1=1');
    console.log('Reviews total for admin:', rTotal);

    // Test getStaffBookings
    const [staffBookings] = await pool.execute(
      `SELECT b.*, t.title, t.start_date, t.end_date, u.full_name, u.email
       FROM bookings b
       LEFT JOIN tours t ON t.id = b.tour_id
       LEFT JOIN users u ON u.id = b.user_id
       ORDER BY b.created_at DESC`
    );
    console.log('Staff bookings count:', staffBookings.length);

    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message, e.stack);
    process.exit(1);
  }
}
test();
