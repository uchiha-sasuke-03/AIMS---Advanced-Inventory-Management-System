const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration() {
  console.log('⚡ Starting corporate database migration...');
  const sqlPath = path.join(__dirname, '../migrations/002_corporate_expansion.sql');
  
  try {
    const rawSql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split lines and remove comment lines
    const cleanLines = rawSql
      .split('\n')
      .map(line => line.trim())
      .filter(line => !line.startsWith('--') && line.length > 0)
      .join(' ');
      
    // Split by semicolons
    const statements = cleanLines
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    const connection = await pool.getConnection();
    
    try {
      console.log(`📌 Found ${statements.length} SQL commands to run.`);
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        console.log(`Executing statement [${i + 1}/${statements.length}]: "${stmt.substring(0, 50)}..."`);
        try {
          await connection.query(stmt);
        } catch (stmtErr) {
          // Catch "Duplicate column name" (1060) or "Duplicate key name" (1061) or "Duplicate entry" (1062)
          if (stmtErr.errno === 1060 || stmtErr.errno === 1061 || stmtErr.errno === 1062) {
            console.warn(`⚠️ Warning (ignored): ${stmtErr.message}`);
          } else {
            throw stmtErr;
          }
        }
      }
      
      console.log('✅ Corporate database migration executed successfully!');
    } catch (err) {
      console.error('❌ Error executing SQL statement:', err.message);
      process.exit(1);
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('❌ Failed to read migration script:', err.message);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration();
