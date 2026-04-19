const pool = require('../config/db');

exports.getDashboardStats = async (req, res) => {
  const [[{ totalUsers }]] = await pool.execute("SELECT COUNT(*) as totalUsers FROM users WHERE role = 'user'");
  const [[{ totalTours }]] = await pool.execute('SELECT COUNT(*) as totalTours FROM tours');
  const [[{ totalBookings }]] = await pool.execute("SELECT COUNT(*) as totalBookings FROM bookings WHERE booking_status != 'cancelled'");
  const [[{ totalRevenue }]] = await pool.execute("SELECT COALESCE(SUM(total_amount), 0) as totalRevenue FROM bookings WHERE payment_status = 'paid'");

  res.json({ totalUsers, totalTours, totalBookings, totalRevenue });
};
