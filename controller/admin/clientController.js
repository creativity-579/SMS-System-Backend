const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { dbQuery } = require("../../db/index");

const clientController = {
  getAllClients: async (req, res) => {
    try {
      const getAllClients = await dbQuery(
        "SELECT * FROM users WHERE role = $1",
        ["client"]
      );
      if (!getAllClients.rows) {
        res.status(405).json("Can't find the users");
      }
      res.json({ message: "success", users: getAllClients.rows });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  },

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

  updateClient: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { name, email, country, rate } = req.body;
      console.log("updateClient-->", req.body, "id-->", id);
      const result = await dbQuery(
        `UPDATE users
        SET name = $1, email = $2, country = $3, rate = $4, update_at = NOW(),
        WHERE id = $5 AND user_id = $6,
        RETURNING *`,
        [name, email, country, rate, id, userId]
      );
      if(!result.rows[0]) {
        res.status(404).json({message: 'User can not found'});
      }
      console.log("update success");
      res.json({message: 'success', user: result.rows[0]});
    } catch (error) {
      res.status(500).json("Server Error!");
      console.log("error", error.message);
    }
  },
};

module.exports = clientController;
