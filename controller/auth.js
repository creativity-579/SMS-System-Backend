require("dotenv").config();
const { dbQuery } = require("../db/index");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const autherController = {
  login: async (req, res) => {
    try {
      const admin = "admin@email.com";
      const { email, password } = req.body;
      const checkUser = await dbQuery("SELECT * FROM users WHERE email = $1", [
        email,
      ]);

      if (!checkUser.rows.length > 0) {
        if (email == admin && password == "2536") {
          const name = "Admin";
          const role = "admin";
          const countryArray = ["US"];
          const rateValue = 10;
          const balance = 100;
          const hashedPassword = await bcrypt.hash(password, 10);
          const createAdmin = await dbQuery(
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
        }
        res.status(406).json("Pleae check again email, password ");
      }

      const { rows } = await dbQuery("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      const user = rows[0];

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        {
          expiresIn: "2400h",
        }
      );

      res.json({ message: "success", token, role: user.role });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  refreshToken: async (req, res) => {
    try {
      const authHeader = req.headers["authorization"];

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ error: "Authorization token missing or invalid" });
      }

      let token = authHeader.split(" ")[1];
      token = token.replace(/^["']|["']$/g, ""); // Remove quotes

      // Verify the token (this will fail if expired, but we can still decode it)
      const decoded = jwt.decode(token);

      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Get user from database
      const { rows } = await dbQuery("SELECT * FROM users WHERE id = $1", [
        decoded.userId,
      ]);
      const user = rows[0];

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Generate new token
      const newToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        }
      );

      res.json({ token: newToken, role: user.role });
    } catch (error) {
      console.error("Error during token refresh:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

module.exports = autherController;
