const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migration...');
    
    // Read the migration SQL file
    const fs = require('fs');
    const path = require('path');
    const migrationSQL = fs.readFileSync(path.join(__dirname, '../model/migration.sql'), 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration(); 