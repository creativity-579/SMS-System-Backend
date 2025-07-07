require("dotenv").config();
const { dbQuery } = require("../../db/index");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const authAdminController = {
  loginAdmin: async (req, res) => {
    try {
      const { email, password } = req.body;

      const createAdmin = {};
      const check = await dbQuery("SELECT * FROM users WHERE email = $1", [
        email,
      ]);

      if (
        !check.rows.length > 0 &&
        email == "admin579@email.com" &&
        password == "2536"
      ) {
        const name = "Admin";
        const countryArray = "US";
        const rateValue = 10;
        const balance = 100;
        const hashedPassword = await bcrypt.hash(password, 10);
        createAdmin = await dbQuery(
          `INSERT INTO users (_id, name, email, password, role, country, rate, balance)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            uuidv4(),
            name,
            email,
            hashedPassword,
            countryArray,
            rateValue,
            balance,
          ]
        );
      }

      const admin = createAdmin.rows[0];
      if (!admin) return res.status(401).json({ error: "Invalid email" });

      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) return res.status(401).json({ error: "Invalid password" });

      const token = jwt.sign(
        { _id: admin._id, email: admin.email },
        process.env.JWT_SECRET,
        { expiresIn: "12h" }
      );

      res.json({ token, role: "admin" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = authAdminController;
