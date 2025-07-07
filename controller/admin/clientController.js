const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { dbQuery } = require("../../db/index");

const clientController = {
  createClient: async (req, res) => {
    try {
      const { name, email, password, country, rate, balance = 0 } = req.body;

      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ error: "Name, email, and password are required." });
      }

      const checkClient = await dbQuery(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      if (checkClient.rows.length > 0) {
        return res.status(409).json({ error: "Email already exists." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const role = "client";
      const countryArray = Array.isArray(country) ? country : [country];
      const rateValue = Number(rate);

      const result = await dbQuery(
        `INSERT INTO users (id, name, email, password, role, country, rate, balance)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          uuidv4(),
          name,
          email,
          hashedPassword,
          role,
          countryArray,
          rateValue,
          balance,
        ]
      );

      res.status(201).json({
        message: "Client created successfully",
        client: result.rows[0],
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },

  getAllClients: async (req, res) => {
    try {
      const getAllClients = await dbQuery("SELECT * FROM users WHERE role = $1", ['client']);
      if(!getAllClients.rows) {
        res.status(405).json("Can't find the users");
      }
      res.json({ message: "success", users: getAllClients.rows });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  },
};

module.exports = clientController;
