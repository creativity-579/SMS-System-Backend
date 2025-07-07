require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
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
