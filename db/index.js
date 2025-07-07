require("dotenv").config();
const { Pool } = require("pg");

// Configure SSL based on environment and database provider
let sslConfig;

if (process.env.NODE_ENV === 'production') {
  // For production, try to use proper SSL
  if (process.env.SSL_CA_CERT) {
    sslConfig = {
      rejectUnauthorized: true,
      ca: process.env.SSL_CA_CERT
    };
  } else {
    // Fallback for databases that don't require specific CA
    sslConfig = {
      rejectUnauthorized: true
    };
  }
} else {
  // For development, allow self-signed certificates
  sslConfig = {
    rejectUnauthorized: false
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

async function dbConnect() {
  try {
    await pool.connect();
    console.log("Successfully connected to Aiven PostgreSQL!");
  } catch (error) {
    console.error("Connection error:", error.stack);
    throw error;
  }
}

async function dbQuery(text, params) {
  try {
    let result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.log("pgDB query error", error);
    throw error;
  }
}

module.exports = {
  dbQuery,
  dbConnect,
};
