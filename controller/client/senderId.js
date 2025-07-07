const { dbQuery } = require("../../db/index");
const { v4: uuidv4 } = require("uuid");

const senderIdController = {
  getSenderIds: async (req, res) => {
    try {
      const userId = req.user.userId;
      const result = await dbQuery(
        `SELECT id, name, purpose, status, rejection_reason, created_at, approved_at
         FROM sender_ids
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      res.json({ message: "success", senderIds: result.rows });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  requestSenderId: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { name, purpose } = req.body;
      if (!name || !/^[A-Za-z0-9]{1,11}$/.test(name)) {
        return res
          .status(400)
          .json({ message: "Sender ID must be 1-11 alphanumeric characters." });
      }
      if (!purpose) {
        return res.status(400).json({ message: "Purpose is required." });
      }

      const exists = await dbQuery(
        `SELECT 1 FROM sender_ids WHERE name = $1 AND user_id = $2`,
        [name, userId]
      );
      if (exists.rows.length > 0) {
        return res
          .status(409)
          .json({ message: "Sender ID already requested." });
      }
      const { rows } = await dbQuery(
        `INSERT INTO sender_ids (id, name, purpose, status, user_id)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING *`,
        [uuidv4(), name, purpose, userId]
      );
      res.status(201).json({ message: "success", senderId: rows[0] });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  updateSenderIdStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, rejection_reason } = req.body;
      let approved_at = null;
      if (status === "approved") approved_at = new Date();
      const { rows } = await dbQuery(
        `UPDATE sender_ids
         SET status = $1, rejection_reason = $2, approved_at = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [status, rejection_reason || null, approved_at, id]
      );
      if (!rows[0])
        return res.status(404).json({ message: "Sender ID not found" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
};

module.exports = senderIdController;
