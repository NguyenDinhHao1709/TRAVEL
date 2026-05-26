require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const pool = require('./src/config/db');
async function test() {
  try {
    const [r1] = await pool.execute("SELECT COUNT(*) as c FROM reviews");
    const [r2] = await pool.execute("SELECT COUNT(*) as c FROM contact_messages");
    const [r3] = await pool.execute("SELECT COUNT(*) as c FROM users WHERE role='user'");
    const [r4] = await pool.execute("SELECT COUNT(*) as c FROM bookings");
    const [r5] = await pool.execute("SELECT COUNT(*) as c FROM system_logs");
    console.log("reviews:", r1[0].c, "| contacts:", r2[0].c, "| customers:", r3[0].c, "| bookings:", r4[0].c, "| logs:", r5[0].c);
    // Test getAdminAllReviews query
    const [rev] = await pool.execute(`SELECT r.id, r.comment, r.rating, r.status, u.full_name as user_name, t.title as tour_title FROM reviews r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN tours t ON t.id = r.tour_id WHERE 1=1 ORDER BY r.created_at DESC LIMIT 10 OFFSET 0`);
    console.log("Reviews sample:", JSON.stringify(rev));
    // Test getContactMessages query
    const [contacts] = await pool.execute("SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 10 OFFSET 0");
    console.log("Contacts sample:", JSON.stringify(contacts));
  } catch(e) { console.error("DB error:", e.message); } finally { process.exit(0); }
}
test();
