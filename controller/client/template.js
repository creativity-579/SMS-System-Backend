const { dbQuery } = require("../../db/index");

const templatesController = {
  getTemplates: async (req, res) => {
    try {
      const userId = req.user.userId;
      const result = await dbQuery(
        `SELECT * FROM templates WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      res.status(200).json({ message: "success", templates: result.rows });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  createTemplate: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { name, content, tags = [], type } = req.body;
      if (!name || !content) {
        return res
          .status(400)
          .json({ message: "Name and content are required." });
      }
      const { rows } = await dbQuery(
        `INSERT INTO templates (name, content, tags, type, user_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, content, tags, type, userId]
      );
      res.status(201).json({ message: "success", template: rows[0] });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  updateTemplate: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { name, content, tags = [], type } = req.body;
      if (!name || !content) {
        return res
          .status(400)
          .json({ message: "Name and content are required." });
      }
      const result = await dbQuery(
        `UPDATE templates
         SET name = $1, content = $2, tags = $3, type = $4, updated_at = NOW()
         WHERE id = $5 AND user_id = $6
         RETURNING *`,
        [name, content, tags, type, id, userId]
      );
      if (!result.rows[0])
        return res.status(404).json({ message: "Template not found" });
      res.json({ message: "success", template: result.rows[0] });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  deleteTemplate: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { rowCount } = await dbQuery(
        `DELETE FROM templates WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      if (!rowCount)
        return res.status(404).json({ message: "Template not found" });
      res.json({ message: "success" });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
};

module.exports = templatesController;
