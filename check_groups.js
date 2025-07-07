require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkGroups() {
  try {
    const result = await pool.query('SELECT id, name FROM contact_groups LIMIT 5');
    
    // Also check if there are any groups at all
    const countResult = await pool.query('SELECT COUNT(*) FROM contact_groups');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

checkGroups(); 