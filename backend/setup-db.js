const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  try {
    // Connect without database first to create it
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✓ Connected to MySQL');

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'sql/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log('Executing schema.sql...');
    await connection.query(schemaSQL);
    console.log('✓ Database schema created');

    // Check if tables exist
    console.log('\n📊 Checking created tables...');
    const [tables] = await connection.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'travel_management'");
    console.log(`Found ${tables.length} tables: ${tables.map(t => t.TABLE_NAME).join(', ')}`);
    
    if (tables.length === 0) {
      throw new Error('No tables were created in the database!');
    }

    // Close and reconnect to ensure fresh connection for seeding
    await connection.end();
    console.log('Reconnecting to database...');
    
    const connection2 = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true,
      database: 'travel_management'
    });
    
    console.log('✓ Reconnected to travel_management database');
    
    // Test query to verify tables exist
    try {
      const [result] = await connection2.query('DESC users');
      console.log(`✓ Table 'users' verified: ${result.length} fields`);
    } catch (err) {
      console.error('❌ Failed to describe users table:', err.message);
      throw err;
    }

    const seedPath = path.join(__dirname, 'sql/seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    console.log('\nExecuting seed.sql...');
    await connection2.query(seedSQL);
    console.log('✓ Sample data inserted');

    console.log('\n✨ Database setup completed!');
    console.log('\nTest credentials:');
    console.log('  Admin: admin@travel.com / password');
    console.log('  Staff: staff@travel.com / password');
    console.log('  User:  user@travel.com / password');

    await connection2.end();
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

require('dotenv').config();
setupDatabase();
