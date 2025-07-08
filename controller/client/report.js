const { dbQuery } = require("../../db/index");

const reportsController = {
  // Fetch delivery reports with filters and pagination
  getDeliveryReports: async (req, res) => {
    try {
      const userId = req.user.userId;
      const {
        type,
        status,
        from,
        to,
        search,
        page = 1,
        pageSize = 50,
      } = req.query;
      const params = [userId];

      let query = `
        SELECT 
          m.id, 
          m.created_at AS date_time, 
          m.phone_number AS recipient, 
          m.type, 
          m.sender_id, 
          m.vendor, 
          m.message, 
          m.status, 
          m.delivery_rate, 
          m.delivered_at,
          cg.name AS group_name,
          c.name AS contact_name
        FROM messages m
        LEFT JOIN contacts c ON m.phone_number = c.phone_number AND m.user_id = c.user_id
        LEFT JOIN contacts_to_groups ctg ON c.id = ctg.contact_id
        LEFT JOIN contact_groups cg ON ctg.group_id = cg.id
        WHERE m.user_id = $1
      `

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
        query += ` AND m.created_at >= $${params.length}`;
      }
      if (to) {
        params.push(to);
        query += ` AND m.created_at <= $${params.length}`;
      }
      if (search) {
        params.push(`%${search}%`);
        query += ` AND (m.phone_number ILIKE $${params.length} OR m.message ILIKE $${params.length} OR cg.name ILIKE $${params.length})`;
      }

      query += " ORDER BY m.created_at DESC";

      // Pagination
      const limit = Math.max(1, Math.min(Number(pageSize), 100));
      const offset = (Math.max(1, Number(page)) - 1) * limit;
      params.push(limit, offset);
      query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
      console.log("error.queyr->", query );
      const { rows } = await dbQuery(query, params);
      console.log("allReports-->", {rows});
      res.json({ message: "success", reports: rows });
    } catch (err) {
      console.error("Error in getDeliveryReports:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
};

module.exports = reportsController;
