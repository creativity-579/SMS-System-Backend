const { dbQuery } = require("../../db/index");

const queueMessageController = {
  getQueuedMessages: async (req, res) => {
    try {
      const { type, status, from, to, search } = req.query;
      let query = `
        SELECT 
          m.id, 
          m.scheduled_at, 
          m.type, 
          m.phone_number AS recipient, 
          m.sender_id, 
          m.vendor, 
          m.message, 
          m.retry_count, 
          m.status, 
          m.created_at,
          cg.name AS group_name,
          c.name AS contact_name
        FROM messages m
        LEFT JOIN contacts c ON m.phone_number = c.phone_number
        LEFT JOIN contacts_to_groups ctg ON c.id = ctg.contact_id
        LEFT JOIN contact_groups cg ON ctg.group_id = cg.id
        WHERE m.status IN ('queued', 'scheduled', 'retrying')
      `;
      const params = [];

      if (type) {
        params.push(type);
        query += ` AND m.type = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND m.status = $${params.length}`;
      }
      if (from) {
        params.push(from);
        query += ` AND m.scheduled_at >= $${params.length}`;
      }
      if (to) {
        params.push(to);
        query += ` AND m.scheduled_at <= $${params.length}`;
      }
      if (search) {
        params.push(`%${search}%`);
        query += ` AND (m.phone_number ILIKE $${params.length} OR m.message ILIKE $${params.length} OR cg.name ILIKE $${params.length})`;
      }

      query += " ORDER BY m.scheduled_at ASC";

      const { rows } = await dbQuery(query, params);
      res.json({ message: "success", messages: rows });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  retryMessage: async (req, res) => {
    try {
      const { id } = req.params;
      console.log("retry-message-id->", {id});
      const { rows: found } = await dbQuery(
        `SELECT status FROM messages WHERE id = $1`,
        [id]
      );    
      if (!found[0]) {
        return res.status(404).json({ message: "Message not found" });
      }
      if (!["retrying", "failed"].includes(found[0].status)) {
        return res
          .status(400)
          .json({ message: "Message is not in a retryable state" });
      }
      const { rows } = await dbQuery(
        `UPDATE messages 
                 SET status = 'queued', retry_count = retry_count + 1 
                 WHERE id = $1
                 RETURNING *`,
        [id]
      );

      res.json({ message: "success", message: rows[0] });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  deleteMessage: async (req, res) => {
    try {
      const { id } = req.params;
      const { rowCount } = await dbQuery(`DELETE FROM messages WHERE id = $1`, [
        id,
      ]);
      if (!rowCount) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.json({ message: "success" });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  getMessageDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await dbQuery(`SELECT * FROM messages WHERE id = $1`, [
        id,
      ]);
      if (!rows[0]) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
};

module.exports = queueMessageController;
