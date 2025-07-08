const { dbQuery } = require("../../db/index");
const { Parser } = require('json2csv');

const campaignController = {
  async index(req, res) {
    try {
      const { page = 1, limit = 20, status, client, search } = req.query;
      const offset = (page - 1) * limit;
      let where = [];
      let params = [];
      let i = 1;
      if (status) { where.push(`c.status = $${i++}`); params.push(status); }
      if (client) { where.push(`c.user_id = $${i++}`); params.push(client); }
      if (search) {
        where.push(`(LOWER(c.name) LIKE $${i} OR c.user_id IN (SELECT id FROM users WHERE LOWER(email) LIKE $${i}))`);
        params.push(`%${search.toLowerCase()}%`);
        i++;
      }
      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const totalResult = await dbQuery(`SELECT COUNT(*) FROM campaigns c ${whereClause}`, params);
      const total = parseInt(totalResult.rows[0].count, 10);
      const result = await dbQuery(
        `SELECT c.*, u.email as client_email, u.name as client_name FROM campaigns c
         JOIN users u ON c.user_id = u.id
         ${whereClause}
         ORDER BY c.created_at DESC
         LIMIT $${i} OFFSET $${i+1}`,
        [...params, limit, offset]
      );
      res.json({ message: "success", total, page: +page, limit: +limit, campaigns: result.rows });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async show(req, res) {
    try {
      const { id } = req.params;
      const result = await dbQuery(
        `SELECT c.*, u.email as client_email, u.name as client_name FROM campaigns c
         JOIN users u ON c.user_id = u.id WHERE c.id = $1`,
        [id]
      );
      if (!result.rows[0]) return res.status(404).json({ message: "Not found" });
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async pause(req, res) {
    try {
      const { id } = req.params;
      const result = await dbQuery(
        `UPDATE campaigns SET status = 'Paused', updated_at = NOW() WHERE id = $1 AND status = 'SENDING' RETURNING *`,
        [id]
      );
      if (!result.rows[0]) return res.status(404).json({ message: "Campaign not found or not running" });
      res.json({ message: "Campaign paused", campaign: result.rows[0] });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async resume(req, res) {
    try {
      const { id } = req.params;
      const result = await dbQuery(
        `UPDATE campaigns SET status = 'SENDING', updated_at = NOW() WHERE id = $1 AND status = 'Paused' RETURNING *`,
        [id]
      );
      if (!result.rows[0]) return res.status(404).json({ message: "Campaign not found or not paused" });
      res.json({ message: "Campaign resumed", campaign: result.rows[0] });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async complete(req, res) {
    try {
      const { id } = req.params;
      const result = await dbQuery(
        `UPDATE campaigns SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1 AND status IN ('SENDING', 'Paused') RETURNING *`,
        [id]
      );
      if (!result.rows[0]) return res.status(404).json({ message: "Campaign not found or not active" });
      res.json({ message: "Campaign completed", campaign: result.rows[0] });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async export(req, res) {
    try {
      const { status, client, search } = req.query;
      let where = [];
      let params = [];
      let i = 1;
      if (status) { where.push(`c.status = $${i++}`); params.push(status); }
      if (client) { where.push(`c.user_id = $${i++}`); params.push(client); }
      if (search) {
        where.push(`(LOWER(c.name) LIKE $${i} OR c.user_id IN (SELECT id FROM users WHERE LOWER(email) LIKE $${i}))`);
        params.push(`%${search.toLowerCase()}%`);
        i++;
      }
      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const result = await dbQuery(
        `SELECT c.*, u.email as client_email, u.name as client_name FROM campaigns c
         JOIN users u ON c.user_id = u.id
         ${whereClause}
         ORDER BY c.created_at DESC`,
        params
      );
      const fields = ['id', 'name', 'status', 'client_email', 'client_name', 'scheduled_at', 'sent_at', 'sent', 'delivered', 'failed', 'created_at'];
      const parser = new Parser({ fields });
      const csv = parser.parse(result.rows);
      res.header('Content-Type', 'text/csv');
      res.attachment('campaigns_export.csv');
      return res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 7. Campaign progress, delivery rate, and message stats
  async stats(req, res) {
    try {
      const { id } = req.params;
      const result = await dbQuery(
        `SELECT 
          COUNT(*) as total_messages,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
         FROM messages WHERE campaign_id = $1`,
        [id]
      );
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};

module.exports = campaignController; 