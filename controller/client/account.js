const bcrypt = require("bcryptjs");
const { dbQuery } = require("../../db/index");

const accountSettingController = {
  // Get current user's profile
  getProfile: async (req, res) => {
    try {
      const userId = req.user.userId; // assuming JWT middleware sets req.user
      const { rows } = await db.query(
        "SELECT id, email,emaill_name, phone_number, balance, role, created_at FROM users WHERE id = $1",
        [userId]
      );
      if (!rows[0]) return res.status(404).json({ message: "User not found" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  // Update current user's profile
  updateProfile: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { full_name, email } = req.body;
      const { rows } = await dbQuery(
        `UPDATE users SET name = $1, email = $2 WHERE id = $3
                RETURNING id, email, name, balance, role, created_at`,
        [full_name, email, userId]
      );
      if (!rows[0]) return res.status(404).json({ message: "User not found" });
      res.json({ message: "success", user: rows[0] });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  updatePassword: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { newPassword } = req.body;

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const { rows } = await dbQuery(
        `UPDATE users SET password = $1 WHERE id = $2
        RETURNING id, password`,
        [hashedPassword, userId]
      );
      if (!rows[0]) return res.status(404).json({ message: "user not found" });
      res.json({ message: "success", user: rows[0] });
    } catch (error) {
      console.log("error", error.message);
    }
  },
};

module.exports = accountSettingController;
