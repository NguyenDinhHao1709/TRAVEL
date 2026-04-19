require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  console.log('Seeding database...');

  const adminHash = await bcrypt.hash('Admin@2025', 10);
  const staffHash = await bcrypt.hash('Staff@2025', 10);
  const userHash = await bcrypt.hash('User@2025', 10);

  // Insert users (skip if email exists)
  const users = [
    ['Quản trị viên', 'admin@travel.com', adminHash, 'admin'],
    ['Nhân viên HK2', 'staff@travel.com', staffHash, 'staff'],
    ['Khách hàng Demo', 'user@travel.com', userHash, 'user']
  ];

  for (const [full_name, email, password, role] of users) {
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
        [full_name, email, password, role]
      );
      console.log(`  Created user: ${email} (password: ${role === 'admin' ? 'Admin@2025' : role === 'staff' ? 'Staff@2025' : 'User@2025'})`);
    } else {
      console.log(`  Skipped existing user: ${email}`);
    }
  }

  // Insert tours
  const [existingTours] = await pool.execute('SELECT COUNT(*) as count FROM tours');
  if (existingTours[0].count === 0) {
    await pool.execute(`
      INSERT INTO tours (title, destination, itinerary, price, start_date, end_date, slots, image_url) VALUES
      ('Tour Đà Nẵng 3N2D', 'Đà Nẵng', 'Ngày 1: TP.HCM - Đà Nẵng\\nNgày 2: Bà Nà Hills - Cầu Vàng\\nNgày 3: Phố Cổ Hội An - TP.HCM', 3500000, '2026-06-10', '2026-06-12', 30, 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80'),
      ('Tour Phú Quốc 4N3D', 'Phú Quốc', 'Ngày 1: TP.HCM - Phú Quốc\\nNgày 2: Safari & Cáp treo\\nNgày 3: Hòn Thơm\\nNgày 4: Về TP.HCM', 5500000, '2026-07-02', '2026-07-05', 25, 'https://images.unsplash.com/photo-1573715806542-7a0ed6f4a4e6?auto=format&fit=crop&w=800&q=80'),
      ('Tour Hà Nội - Hạ Long 5N4D', 'Hạ Long', 'Ngày 1: Bay ra Hà Nội\\nNgày 2-4: Vịnh Hạ Long\\nNgày 5: Về TP.HCM', 7200000, '2026-08-15', '2026-08-19', 20, 'https://images.unsplash.com/photo-1573390927200-e7d58d8ee57c?auto=format&fit=crop&w=800&q=80')
    `);
    console.log('  Created 3 sample tours');

    await pool.execute(`
      INSERT INTO articles (tour_id, title, content, image_url) VALUES
      (1, 'Kinh nghiệm đi Đà Nẵng', 'Đà Nẵng là thành phố biển tuyệt đẹp...', 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80'),
      (2, 'Khám phá Phú Quốc', 'Phú Quốc - hòn đảo ngọc của Việt Nam...', 'https://images.unsplash.com/photo-1573715806542-7a0ed6f4a4e6?auto=format&fit=crop&w=1200&q=80'),
      (NULL, 'Cẩm nang du lịch Việt Nam 2026', 'Hướng dẫn toàn diện cho du khách...', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80')
    `);
    console.log('  Created 3 sample articles');
  } else {
    console.log(`  Skipped tours (already have ${existingTours[0].count})`);
  }

  await pool.execute(
    `INSERT INTO activity_logs (role, action, details) VALUES ('system', 'System initialized', 'Seed script executed')`
  );

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
