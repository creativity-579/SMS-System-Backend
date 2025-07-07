const { dbQuery } = require("../db/index");
const bcrypt = require("bcryptjs");
const {v4 : uuidv4} = require("uuid");

const name = "Admin"
const email = "admin579@email.com"; // Change this to your desired admin email
const password = "2536"; // Change this to your desired admin password
const countryArray=['US'];
const rateValue=10;
const balance = 100;

async function seedAdmin() {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await dbQuery(
      `INSERT INTO clients (_id, name, email, password, country, rate, balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [uuidv4(), name, email, hashedPassword, countryArray, rateValue, balance]
    );
    console.log("Admin user created:", result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      console.log("Admin user already exists.");
    } else {
      console.error("Error seeding admin user:", error);
    }
  } finally {
    process.exit();
  }
}

seedAdmin();
