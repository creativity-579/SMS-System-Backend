const { dbQuery } = require("../../db/index");
const { v4: uuidv4 } = require("uuid");
const { Parser } = require('json2csv');

const ALLOWED_STATUSES = ["DRAFT", "SCHEDULED", "SENDING", "PAUSED", "COMPLETED", "CANCELLED"];

const campaignController = {
  getCampaigns: async (req, res) => {
    try {
      const userId = req.user.userId;
      const result = await dbQuery(
        `
        SELECT c.*, ARRAY_AGG(g.name) as groups
        FROM campaigns c
        LEFT JOIN campaign_groups cg ON c.id = cg.campaign_id
        LEFT JOIN contact_groups g ON cg.group_id = g.id
        WHERE c.user_id = $1
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `,
        [userId]
      );
      res.json({ message: "success", campaigns: result.rows });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  },

  createCampaign: async (req, res) => {
    try {
      const userId = req.user.userId;
      const {
        name,
        groups,
        message,
        senderId,
        status,
        sent = 0,
        delivered = 0,
        failed = 0,
      } = req.body;

      const campaignId = uuidv4();
      const now = new Date();
      const _status = status ? status.toUpperCase() : "DRAFT";
      if (!ALLOWED_STATUSES.includes(_status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      // Accept senderId as string
      const sender_id = typeof senderId === 'string' ? senderId : (senderId && senderId.id ? senderId.id : null);
      if (!sender_id) return res.status(400).json({ error: "Invalid senderId" });

      await dbQuery(
        `INSERT INTO campaigns (id, name, user_id, message, sender_id, sent, delivered, failed, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          campaignId,
          name,
          userId,
          message,
          sender_id,
          sent,
          delivered,
          failed,
          _status,
          now,
          now,
        ]
      );

      // Accept groups as array of UUIDs
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const validGroups = (groups || []).filter(
        (gid) => gid && uuidRegex.test(gid)
      );
      for (const groupId of validGroups) {
        await dbQuery(
          `INSERT INTO campaign_groups (campaign_id, group_id) VALUES ($1, $2)`,
          [campaignId, groupId]
        );
      }
      res.status(201).json({ message: "success", id: campaignId });
    } catch (err) {
      console.error("pgDB query error", err);
      res.status(500).json({ error: "Server error", details: err.message });
    }
  },

  updateCampaign: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const {
        name,
        message,
        senderId,
        status,
        groups,
        sent = 0,
        delivered = 0,
        failed = 0,
      } = req.body;
      const _status = status ? status.toUpperCase() : undefined;
      if (_status && !ALLOWED_STATUSES.includes(_status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const sender_id = typeof senderId === 'string' ? senderId : (senderId && senderId.id ? senderId.id : null);
      if (!sender_id) return res.status(400).json({ error: "Invalid senderId" });
      await dbQuery(
        `UPDATE campaigns
         SET name = $1, message = $2, sender_id = $3, status = $4, sent = $5, delivered = $6, failed = $7, updated_at = NOW()
         WHERE id = $8 AND user_id = $9`,
        [name, message, sender_id, _status, sent, delivered, failed, id, userId]
      );
      // Update campaign_groups (remove all and re-insert)
      await dbQuery(`DELETE FROM campaign_groups WHERE campaign_id = $1`, [id]);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const validGroups = (groups || []).filter(
        (gid) => gid && uuidRegex.test(gid)
      );
      for (const groupId of validGroups) {
        await dbQuery(
          `INSERT INTO campaign_groups (campaign_id, group_id) VALUES ($1, $2)`,
          [id, groupId]
        );
      }
      res.json({ message: "success" });
    } catch (err) {
      console.error("pgDB query error", err);
      res.status(500).json({ error: "Server error", details: err.message });
    }
  },

  deleteCampaign: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      await dbQuery(`DELETE FROM campaign_groups WHERE campaign_id = $1`, [id]);

      const { rowCount } = await dbQuery(
        `DELETE FROM campaigns WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (rowCount === 0) {
        return res
          .status(404)
          .json({ error: "Campaign not found or not authorized" });
      }

      res.json({ message: "success" });
    } catch (err) {
      console.error("pgDB query error", err);
      res.status(500).json({ error: "Server error", details: err.message });
    }
  },

  pauseCampaign: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { rows } = await dbQuery(
        `UPDATE campaigns
         SET status = 'PAUSED', updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status IN ('SENDING', 'SCHEDULED')
         RETURNING *`,
        [id, userId]
      );
      if (!rows[0]) {
        return res.status(400).json({ error: "Cannot pause campaign in current state or not found" });
      }
      res.json({ message: "Campaign paused", campaign: rows[0] });
    } catch (err) {
      res.status(500).json({ error: "Server error", details: err.message });
    }
  },

  resumeCampaign: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      // Only allow resuming if currently PAUSED
      const { rows } = await dbQuery(
        `UPDATE campaigns
         SET status = 'SENDING', updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status = 'PAUSED'
         RETURNING *`,
        [id, userId]
      );
      if (!rows[0]) {
        return res.status(400).json({ error: "Cannot resume campaign in current state or not found" });
      }
      res.json({ message: "Campaign resumed", campaign: rows[0] });
    } catch (err) {
      res.status(500).json({ error: "Server error", details: err.message });
    }
  },

  progress: async (req, res) => {
    const { id } = req.params;
    const result = await dbQuery(
      `SELECT 
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent
       FROM messages
       WHERE campaign_id = $1`,
      [id]
    );
    res.json(result.rows[0]);
  },

  report: async (req, res) => {
    const { id } = req.params;
    const result = await dbQuery(
      `SELECT 
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM messages
       WHERE campaign_id = $1`,
      [id]
    );
    res.json(result.rows[0]);
  },

  exportCampaigns: async (req, res) => {
    try {
      const userId = req.user.userId;
      const result = await dbQuery(
        `SELECT c.*, ARRAY_AGG(g.name) as groups
         FROM campaigns c
         LEFT JOIN campaign_groups cg ON c.id = cg.campaign_id
         LEFT JOIN contact_groups g ON cg.group_id = g.id
         WHERE c.user_id = $1
         GROUP BY c.id
         ORDER BY c.created_at DESC`,
        [userId]
      );
      const fields = ['id', 'name', 'status', 'sender_id', 'groups', 'sent', 'delivered', 'failed', 'created_at'];
      const parser = new Parser({ fields });
      const csv = parser.parse(result.rows);
      res.header('Content-Type', 'text/csv');
      res.attachment('campaigns_export.csv');
      return res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  logsByVendor: async (req, res) => {
    const { id } = req.params;
    const result = await dbQuery(
      `SELECT vendor, COUNT(*) AS total, 
             SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
             SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM messages
       WHERE campaign_id = $1
       GROUP BY vendor;`,
      [id]
    );
    res.json(result.rows);
  },
};
module.exports = campaignController;
