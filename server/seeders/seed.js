const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // Connect without database first to create it
  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  // Run migration
  console.log('📋 Running migration...');
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, '..', 'migrations', '001_initial_schema.sql'),
    'utf8'
  );
  await rootConn.query(migrationSQL);
  await rootConn.end();
  console.log('✅ Migration complete\n');

  // Connect to the database
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aims_db'
  });

  // Clear existing data in correct order
  console.log('🗑️  Clearing existing data...');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  await conn.query('TRUNCATE TABLE damage_reports');
  await conn.query('TRUNCATE TABLE allocations');
  await conn.query('TRUNCATE TABLE assets');
  await conn.query('TRUNCATE TABLE asset_categories');
  await conn.query('TRUNCATE TABLE users');
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  // ============== USERS ==============
  console.log('👥 Seeding users...');
  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
  const defaultHash = await bcrypt.hash('Password@123', 10);

  const users = [
    ['EMP000', 'Admin User', 35, 2500000, 'admin@techcorp.co.in', 'IT', adminHash, 'admin'],
    ['EMP001', 'Rajesh Kumar', 32, 1500000, 'r.kumar@techcorp.co.in', 'Engineering', defaultHash, 'employee'],
    ['EMP002', 'Priya Sharma', 28, 1200000, 'priya.s@techcorp.co.in', 'Engineering', defaultHash, 'employee'],
    ['EMP003', 'Amit Patel', 30, 1350000, 'a.patel@techcorp.co.in', 'Engineering', defaultHash, 'employee'],
    ['EMP004', 'Sneha Reddy', 26, 850000, 'sneha.r@techcorp.co.in', 'HR', defaultHash, 'employee'],
    ['EMP005', 'Vikram Singh', 34, 1800000, 'v.singh@techcorp.co.in', 'Engineering', defaultHash, 'employee'],
    ['EMP006', 'Ananya Iyer', 27, 950000, 'ananya.i@techcorp.co.in', 'Marketing', defaultHash, 'employee'],
    ['EMP007', 'Rahul Gupta', 31, 1100000, 'rahul.g@techcorp.co.in', 'Finance', defaultHash, 'employee'],
    ['EMP008', 'Kavitha Nair', 29, 1050000, 'kavitha.n@techcorp.co.in', 'HR', defaultHash, 'employee'],
    ['EMP009', 'Suresh Menon', 38, 2200000, 'suresh.m@techcorp.co.in', 'Engineering', defaultHash, 'employee'],
    ['EMP010', 'Divya Joshi', 25, 750000, 'divya.j@techcorp.co.in', 'Marketing', defaultHash, 'employee'],
    ['EMP011', 'Arjun Deshmukh', 33, 1600000, 'arjun.d@techcorp.co.in', 'Engineering', defaultHash, 'employee'],
    ['EMP012', 'Meera Krishnan', 30, 1250000, 'meera.k@techcorp.co.in', 'Finance', defaultHash, 'employee'],
    ['EMP013', 'Rohit Agarwal', 36, 1900000, 'rohit.a@techcorp.co.in', 'Operations', defaultHash, 'employee'],
    ['EMP014', 'Pooja Bhatia', 24, 650000, 'pooja.b@techcorp.co.in', 'HR', defaultHash, 'employee'],
    ['EMP015', 'Karthik Subramanian', 29, 1150000, 'karthik.s@techcorp.co.in', 'Engineering', defaultHash, 'employee'],
  ];

  for (const u of users) {
    await conn.query(
      'INSERT INTO users (emp_id, name, age, salary, email, department, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      u
    );
  }
  console.log(`  ✅ ${users.length} users created (Admin: admin@techcorp.co.in / Admin@123)\n`);

  // ============== ASSET CATEGORIES ==============
  console.log('📁 Seeding asset categories...');
  const categories = [
    ['Laptops', 'Portable computing devices including notebooks and ultrabooks'],
    ['Monitors', 'External display screens and monitors'],
    ['Phones', 'Mobile phones and smartphones for business use'],
    ['Accessories', 'Peripherals including keyboards, mice, headsets, docking stations'],
  ];

  for (const c of categories) {
    await conn.query('INSERT INTO asset_categories (name, description) VALUES (?, ?)', c);
  }
  console.log(`  ✅ ${categories.length} categories created\n`);

  // ============== ASSETS ==============
  console.log('💻 Seeding assets...');
  const assets = [
    // Laptops (category_id = 1)
    [1, 'Dell Latitude 5540', 'Latitude 5540 i7', 'DL-BLR-2024-001', '2024-01-15', 95000, 'in_stock', 'IT Department'],
    [1, 'Dell Latitude 5540', 'Latitude 5540 i5', 'DL-BLR-2024-002', '2024-01-15', 82000, 'in_stock', 'IT Department'],
    [1, 'HP EliteBook 840 G10', 'EliteBook 840 G10', 'HP-PUN-2024-001', '2024-02-10', 105000, 'in_stock', 'Server Room'],
    [1, 'HP EliteBook 840 G10', 'EliteBook 840 G10', 'HP-PUN-2024-002', '2024-02-10', 105000, 'in_stock', 'Server Room'],
    [1, 'Lenovo ThinkPad X1 Carbon', 'X1 Carbon Gen 11', 'LN-HYD-2024-001', '2024-03-05', 145000, 'in_stock', 'Storage Room'],
    [1, 'Lenovo ThinkPad T14s', 'T14s Gen 4', 'LN-NOI-2024-001', '2024-03-05', 98000, 'in_stock', 'Main Office'],
    [1, 'MacBook Pro 14"', 'MBP M3 Pro 14"', 'AP-BLR-2024-001', '2024-04-01', 199000, 'in_stock', 'IT Department'],
    [1, 'MacBook Pro 14"', 'MBP M3 Pro 14"', 'AP-CHN-2024-001', '2024-04-01', 199000, 'in_stock', 'Sales Room'],
    [1, 'Dell Inspiron 15', 'Inspiron 15 3520', 'DL-MUM-2024-001', '2024-05-20', 55000, 'in_stock', 'Reception'],
    [1, 'ASUS VivoBook 15', 'VivoBook 15 X1504', 'AS-NOI-2024-001', '2024-06-12', 48000, 'in_stock', 'Main Office'],

    // Monitors (category_id = 2)
    [2, 'LG UltraWide 34"', '34WN80C-B', 'LG-BLR-2024-001', '2024-01-20', 42000, 'in_stock', 'IT Department'],
    [2, 'LG UltraWide 34"', '34WN80C-B', 'LG-BLR-2024-002', '2024-01-20', 42000, 'in_stock', 'IT Department'],
    [2, 'Dell UltraSharp 27"', 'U2722D', 'DM-PUN-2024-001', '2024-02-15', 35000, 'in_stock', 'Server Room'],
    [2, 'Dell UltraSharp 27"', 'U2722D', 'DM-HYD-2024-001', '2024-02-15', 35000, 'in_stock', 'Storage Room'],
    [2, 'Samsung 32" 4K', 'S32A800', 'SM-CHN-2024-001', '2024-03-10', 38000, 'in_stock', 'Sales Room'],
    [2, 'BenQ PD2700U 27"', 'PD2700U', 'BQ-MUM-2024-001', '2024-04-05', 45000, 'in_stock', 'Reception'],
    [2, 'HP E24 G5 24"', 'E24 G5', 'HM-NOI-2024-001', '2024-05-01', 18000, 'in_stock', 'Main Office'],
    [2, 'HP E24 G5 24"', 'E24 G5', 'HM-NOI-2024-002', '2024-05-01', 18000, 'in_stock', 'Main Office'],

    // Phones (category_id = 3)
    [3, 'Samsung Galaxy S24', 'Galaxy S24 256GB', 'SG-BLR-2024-001', '2024-02-01', 74999, 'in_stock', 'IT Department'],
    [3, 'Samsung Galaxy S24', 'Galaxy S24 256GB', 'SG-PUN-2024-001', '2024-02-01', 74999, 'in_stock', 'Server Room'],
    [3, 'iPhone 15', 'iPhone 15 128GB', 'IP-HYD-2024-001', '2024-03-15', 79900, 'in_stock', 'Storage Room'],
    [3, 'iPhone 15', 'iPhone 15 128GB', 'IP-BLR-2024-001', '2024-03-15', 79900, 'in_stock', 'IT Department'],
    [3, 'OnePlus 12', 'OnePlus 12 256GB', 'OP-NOI-2024-001', '2024-04-10', 64999, 'in_stock', 'Main Office'],
    [3, 'Pixel 8', 'Pixel 8 128GB', 'PX-CHN-2024-001', '2024-05-01', 75999, 'in_stock', 'Sales Room'],

    // Accessories (category_id = 4)
    [4, 'Logitech MX Master 3S', 'MX Master 3S', 'LM-BLR-2024-001', '2024-01-10', 8995, 'in_stock', 'IT Department'],
    [4, 'Logitech MX Master 3S', 'MX Master 3S', 'LM-BLR-2024-002', '2024-01-10', 8995, 'in_stock', 'IT Department'],
    [4, 'Keychron K2 Keyboard', 'K2 V2 RGB', 'KC-PUN-2024-001', '2024-02-20', 7499, 'in_stock', 'Server Room'],
    [4, 'Sony WH-1000XM5', 'WH-1000XM5', 'SN-HYD-2024-001', '2024-03-01', 29990, 'in_stock', 'Storage Room'],
    [4, 'Sony WH-1000XM5', 'WH-1000XM5', 'SN-BLR-2024-001', '2024-03-01', 29990, 'in_stock', 'IT Department'],
    [4, 'CalDigit TS4 Dock', 'TS4 Thunderbolt', 'CD-NOI-2024-001', '2024-04-15', 32000, 'in_stock', 'Main Office'],
    [4, 'Logitech C920 Webcam', 'C920 HD Pro', 'LC-MUM-2024-001', '2024-05-10', 8499, 'in_stock', 'Reception'],
    [4, 'Apple Magic Keyboard', 'Magic Keyboard', 'AK-CHN-2024-001', '2024-06-01', 10900, 'in_stock', 'Sales Room'],
  ];

  for (const a of assets) {
    await conn.query(
      'INSERT INTO assets (category_id, name, model, serial_number, purchase_date, price, status, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      a
    );
  }
  console.log(`  ✅ ${assets.length} assets created\n`);

  // ============== ALLOCATIONS ==============
  console.log('📋 Seeding allocations...');

  // Active allocations (returned_at = NULL)
  const activeAllocations = [
    // asset_id, user_id, allocated_by, expected_return_offset_days, notes
    [1, 2, 1, 60, 'Primary work laptop for Rajesh'],        // Dell Latitude -> Rajesh
    [5, 3, 1, 90, 'Development machine for Priya'],          // ThinkPad X1 -> Priya
    [7, 6, 1, 120, 'MacBook for senior engineer Vikram'],     // MacBook Pro -> Vikram
    [11, 2, 1, 45, 'External monitor for Rajesh'],           // LG UltraWide -> Rajesh
    [19, 10, 1, -5, 'Business phone for Suresh (Overdue return)'], // Samsung Galaxy -> Suresh (Overdue)
    [25, 4, 1, 15, 'Mouse for Amit'],                        // Logitech Mouse -> Amit
    [28, 6, 1, 30, 'Noise cancelling headphones for Vikram'],// Sony Headphones -> Vikram
  ];
 
  for (const a of activeAllocations) {
    await conn.query(
      `INSERT INTO allocations (asset_id, user_id, allocated_by, expected_return_date, notes, allocated_at) 
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?, NOW() - INTERVAL FLOOR(RAND() * 90) DAY)`,
      [a[0], a[1], a[2], a[3], a[4]]
    );
    // Update asset status
    await conn.query("UPDATE assets SET status = 'allocated' WHERE id = ?", [a[0]]);
  }

  // Past allocations (returned)
  const pastAllocations = [
    [3, 4, 1, '2024-09-01', '2024-12-15', 'good', 'Temporary laptop for Amit during project'],
    [9, 7, 1, '2024-08-01', '2024-11-30', 'good', 'Dell Inspiron for Ananya - marketing campaign'],
    [13, 8, 1, '2024-07-15', '2024-10-20', 'good', 'Monitor returned after project completion'],
  ];

  for (const a of pastAllocations) {
    await conn.query(
      `INSERT INTO allocations (asset_id, user_id, allocated_by, expected_return_date, returned_at, condition_on_return, notes, allocated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ? - INTERVAL 90 DAY)`,
      [a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[4]]
    );
  }

  console.log(`  ✅ ${activeAllocations.length + pastAllocations.length} allocations created (${activeAllocations.length} active, ${pastAllocations.length} returned)\n`);

  // ============== DAMAGE REPORTS ==============
  console.log('⚠️  Seeding damage reports...');
  const damageReports = [
    [10, 11, 'Screen flickering issue observed on ASUS VivoBook after a fall from the desk. The display shows horizontal lines intermittently.', null, 'high', false, null],
    [17, 5, 'HP Monitor E24 has dead pixels in the lower-right quadrant. Approximately 5-6 dead pixels clustered together affecting display quality.', null, 'medium', true, 'Monitor replaced under warranty. Old unit sent for recycling.'],
    [23, 14, 'OnePlus 12 phone screen cracked after accidental drop in parking area. Touch functionality partially affected on left side of screen.', null, 'critical', false, null],
  ];

  for (const d of damageReports) {
    await conn.query(
      `INSERT INTO damage_reports (asset_id, reported_by, description, photo_path, severity, resolved, resolution_note) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      d
    );
    // Update asset status for unresolved damage
    if (!d[5]) {
      await conn.query("UPDATE assets SET status = 'damaged' WHERE id = ?", [d[0]]);
    }
  }
  console.log(`  ✅ ${damageReports.length} damage reports created\n`);

  console.log('🎉 Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary:');
  console.log(`   Users:      ${users.length}`);
  console.log(`   Categories: ${categories.length}`);
  console.log(`   Assets:     ${assets.length}`);
  console.log(`   Allocations: ${activeAllocations.length + pastAllocations.length}`);
  console.log(`   Damage Reports: ${damageReports.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🔑 Admin Login: admin@techcorp.co.in / Admin@123');

  await conn.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
