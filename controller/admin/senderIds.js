const { dbQuery } = require("../../db/index");
const { Parser } = require("json2csv");

const senderIdsController = {
  getAllSenderIds: async (req, res) => {
    try {
      const senderIds = await dbQuery("SELECT * FROM sender_ids");
      if (!senderIds.rows) {
        res.status(405).json("Can't find the users");
      }
      res.json({ message: "success", senderIds: senderIds.rows });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  },

  async index(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        client,
        date_from,
        date_to,
        search,
      } = req.query;
      const offset = (page - 1) * limit;
      let where = [];
      let params = [];
      let i = 1;
      if (status) {
        where.push(`status = $${i++}`);
        params.push(status);
      }
      if (client) {
        where.push(`user_id = $${i++}`);
        params.push(client);
      }
      if (date_from) {
        where.push(`created_at >= $${i++}`);
        params.push(date_from);
      }
      if (date_to) {
        where.push(`created_at <= $${i++}`);
        params.push(date_to);
      }
      if (search) {
        where.push(
          `(LOWER(name) LIKE $${i} OR user_id IN (SELECT id FROM users WHERE LOWER(email) LIKE $${i}))`
        );
        params.push(`%${search.toLowerCase()}%`);
        i++;
      }
      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalResult = await dbQuery(
        `SELECT COUNT(*) FROM sender_ids ${whereClause}`,
        params
      );
      const total = parseInt(totalResult.rows[0].count, 10);
      const result = await dbQuery(
        `SELECT s.*, u.email as client_email, u.name as client_name FROM sender_ids s
         JOIN users u ON s.user_id = u.id
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...params, limit, offset]
      );
      res.json({
        message: "success",
        total,
        page: +page,
        limit: +limit,
        senderIds: result.rows,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 2. Show details of a specific sender ID request
  async show(req, res) {
    try {
      const { id } = req.params;
      const result = await dbQuery(
        `SELECT s.*, u.email as client_email, u.name as client_name FROM sender_ids s
         JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
        [id]
      );
      if (!result.rows[0])
        return res.status(404).json({ message: "Not found" });
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, rejection_reason } = req.body;
      const now = new Date();
      let result;

      if (status === "approved") {
        result = await dbQuery(
          `UPDATE sender_ids 
           SET status = 'approved', rejection_reason = NULL, approved_at = $1, updated_at = $1 
           WHERE id = $2 AND status = 'pending' 
           RETURNING *`,
          [now, id]
        );
      } else if (status === "rejected") {
        // if (!rejection_reason) {
        //   return res.status(400).json({ message: "Rejection reason required" });
        // }
        result = await dbQuery(
          `UPDATE sender_ids 
           SET status = 'rejected', rejection_reason = $1, approved_at = NULL, updated_at = $2 
           WHERE id = $3 AND status = 'pending' 
           RETURNING *`,
          [rejection_reason, now, id]
        );
      } else {
        return res.status(400).json({ message: "Invalid status" });
      }

      if (!result.rows[0])
        return res.status(404).json({ message: "Sender ID not found or not pending" });

      res.json({ message: "success", senderId: result.rows[0] });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 5. Delete (hard delete)
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const result = await dbQuery(
        `DELETE FROM sender_ids WHERE id = $1 RETURNING *`,
        [id]
      );
      if (!result.rows[0])
        return res.status(404).json({ message: "Sender ID not found" });
      res.json({ message: "Sender ID deleted" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 6. Bulk approve
  async bulkApprove(req, res) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0)
        return res.status(400).json({ message: "ids[] required" });
      const now = new Date();
      const result = await dbQuery(
        `UPDATE sender_ids SET status = 'approved', rejection_reason = NULL, approved_at = $1, updated_at = $1 WHERE id = ANY($2) AND status = 'pending' RETURNING *`,
        [now, ids]
      );
      // TODO: Notify clients (email, notification)
      res.json({
        message: `Approved ${result.rowCount} sender IDs`,
        senderIds: result.rows,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 7. Bulk reject
  async bulkReject(req, res) {
    try {
      const { ids, reason } = req.body;
      if (!Array.isArray(ids) || ids.length === 0)
        return res.status(400).json({ message: "ids[] required" });
      if (!reason)
        return res.status(400).json({ message: "Rejection reason required" });
      const now = new Date();
      const result = await dbQuery(
        `UPDATE sender_ids SET status = 'rejected', rejection_reason = $1, updated_at = $2 WHERE id = ANY($3) AND status = 'pending' RETURNING *`,
        [reason, now, ids]
      );
      // TODO: Notify clients (email, notification)
      res.json({
        message: `Rejected ${result.rowCount} sender IDs`,
        senderIds: result.rows,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 8. Export filtered sender IDs to CSV
  async export(req, res) {
    try {
      // Reuse index() filtering logic
      const { status, client, date_from, date_to, search } = req.query;
      let where = [];
      let params = [];
      let i = 1;
      if (status) {
        where.push(`status = $${i++}`);
        params.push(status);
      }
      if (client) {
        where.push(`user_id = $${i++}`);
        params.push(client);
      }
      if (date_from) {
        where.push(`created_at >= $${i++}`);
        params.push(date_from);
      }
      if (date_to) {
        where.push(`created_at <= $${i++}`);
        params.push(date_to);
      }
      if (search) {
        where.push(
          `(LOWER(name) LIKE $${i} OR user_id IN (SELECT id FROM users WHERE LOWER(email) LIKE $${i}))`
        );
        params.push(`%${search.toLowerCase()}%`);
        i++;
      }
      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const result = await dbQuery(
        `SELECT s.*, u.email as client_email, u.name as client_name FROM sender_ids s
         JOIN users u ON s.user_id = u.id
         ${whereClause}
         ORDER BY s.created_at DESC`,
        params
      );
      const fields = [
        "id",
        "name",
        "status",
        "client_email",
        "client_name",
        "purpose",
        "created_at",
        "approved_at",
        "rejection_reason",
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(result.rows);
      res.header("Content-Type", "text/csv");
      res.attachment("sender_ids_export.csv");
      return res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};

module.exports = senderIdsController;
