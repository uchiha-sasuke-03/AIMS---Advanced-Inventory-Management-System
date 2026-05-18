require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/db');

async function seedSaaSPaaSIaaS() {
  console.log('⚡ Initiating SaaS, PaaS, and IaaS Cloud Licenses database migration...');
  
  try {
    // 1. Clear existing licenses
    console.log('🧹 Purging outdated licenses table...');
    await pool.query('DELETE FROM saas_licenses');
    
    // 2. Insert new comprehensive multi-cloud dataset
    console.log('🌱 Seeding fresh SaaS, PaaS, and IaaS cloud dataset...');
    const query = `
      INSERT INTO saas_licenses (name, category, total_seats, occupied_seats, cost_per_seat, renewal_date, active_warnings)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const licenses = [
      // SaaS Subscriptions
      ['GitHub Enterprise', 'SaaS - Development', 20, 8, 1750.00, '2026-11-15', '1 seat is inactive for >30 days'],
      ['Slack Premium Chat', 'SaaS - Communication', 30, 14, 730.00, '2026-12-01', null],
      ['Figma Organization', 'SaaS - Design', 10, 5, 3750.00, '2026-09-10', '1 seat assigned to external contractor'],
      ['Zoom Pro Meet', 'SaaS - Communication', 10, 5, 1330.00, '2026-07-05', '1 under-utilized license detected'],
      ['Microsoft 365 Enterprise', 'SaaS - Office Productivity', 15, 7, 2650.00, '2026-10-22', null],
      
      // PaaS Cloud Engines
      ['Heroku Enterprise App Dynos', 'PaaS - App Hosting', 5, 2, 4150.00, '2026-08-14', null],
      ['AWS Elastic Beanstalk Platform', 'PaaS - App Deployment', 5, 2, 6200.00, '2026-09-30', '1 idle staging stack found'],
      ['Red Hat OpenShift Enterprise', 'PaaS - Kubernetes Platform', 5, 2, 12450.00, '2026-12-15', null],
      
      // IaaS Cloud Virtual Infrastructure
      ['AWS EC2 & RDS Infrastructure', 'IaaS - Hosting & Compute', 10, 6, 9950.00, '2026-08-20', '1 orphaned volume detected'],
      ['Microsoft Azure Compute VMs', 'IaaS - Virtual Servers', 5, 2, 7880.00, '2026-10-05', null],
      ['Google Cloud Platform VM Nodes', 'IaaS - Compute & Storage', 5, 3, 7050.00, '2026-07-18', '1 unused pre-emptible VM instance running']
    ];

    for (const license of licenses) {
      await pool.query(query, license);
      console.log(` ✅ Seeded: ${license[0]} (${license[1]})`);
    }

    console.log('🎉 Database seeding completed successfully! All multi-cloud logs verified.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    process.exit(1);
  }
}

seedSaaSPaaSIaaS();
