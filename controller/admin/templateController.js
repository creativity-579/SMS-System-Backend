const { dbQuery } = require("../../db/index");

const templateController = {
  // 1. Get all templates (with optional filtering, pagination, search)
  //   async getAllTemplates(req, res) {
  //     try {
  //       const { page = 1, limit = 20, status, user, search } = req.query;
  //       const offset = (page - 1) * limit;
  //       let where = [];
  //       let params = [];
  //       let i = 1;
  //       if (status) { where.push(`t.status = $${i++}`); params.push(status); }
  //       if (user) { where.push(`t.user_id = $${i++}`); params.push(user); }
  //       if (search) {
  //         where.push(`(LOWER(t.name) LIKE $${i} OR LOWER(t.content) LIKE $${i})`);
  //         params.push(`%${search.toLowerCase()}%`);
  //         i++;
  //       }
  //       const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  //       const totalResult = await dbQuery(`SELECT COUNT(*) FROM templates t ${whereClause}`, params);
  //       const total = parseInt(totalResult.rows[0].count, 10);
  //       const result = await dbQuery(
  //         `SELECT t.*, u.email as user_email, u.name as user_name FROM templates t
  //          JOIN users u ON t.user_id = u.id
  //          ${whereClause}
  //          ORDER BY t.created_at DESC
  //          LIMIT $${i} OFFSET $${i+1}`,
  //         [...params, limit, offset]
  //       );
  //       res.json({ message: "success", total, page: +page, limit: +limit, templates: result.rows });
  //     } catch (error) {
  //       res.status(500).json({ message: "Server error", error: error.message });
  //     }
  //   },

  getAllTemplates: async (req, res) => {
    try {
      const templates = await dbQuery(`SELECT * FROM templates`);
      if (!templates.rows) return res.status(404).json("Can't found templates");
      res.json({ message: "success", templates: templates.rows });
    } catch (error) {
      res.status(500).json("Server Error");
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const now = new Date();
      let result;
      if (status === "approved") {
        result = await dbQuery(
          `UPDATE templates 
           SET status = 'approved', updated_at = $1 
           WHERE id = $2 AND status = 'pending' 
           RETURNING *`,
          [now, id]
        );
      } else if (status === "rejected") {
        result = await dbQuery(
          `UPDATE templates 
           SET status = 'rejected', updated_at = $1 
           WHERE id = $2 AND status = 'pending' 
           RETURNING *`,
          [now, id]
        );
      } else {
        return res.status(400).json({ message: "Invalid status" });
      };
      if (!result.rows[0])
        return res.status(404).json({ message: "Template not found or not pending" });
      res.json({ message: "success", template: result.rows[0] });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};

module.exports = templateController;
