const { dbQuery } = require("../../db/index");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const groupManagementController = {
  getGroups: async (req, res) => {
    try {
      const result = await dbQuery(`
                SELECT 
                    g.id, g.name, g.description, g.created_at AS created, g.status,
                    COUNT(cg.contact_id) AS contacts
                FROM contact_groups g
                LEFT JOIN contacts_to_groups cg ON g.id = cg.group_id
                GROUP BY g.id
                ORDER BY g.created_at DESC
            `);
      res.json({ message: "success", groups: result.rows });
    } catch (err) {
      console.error("Error fetching groups", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  createGroup: async (req, res) => {
    const { name, description, phoneNumbers, status = "active" } = req.body;
    if (
      !name ||
      !phoneNumbers ||
      !Array.isArray(phoneNumbers) ||
      phoneNumbers.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Name and phone numbers are required." });
    }
    try {
      const groupId = uuidv4();
      await dbQuery(
        "INSERT INTO contact_groups (id, name, description, status, user_id) VALUES ($1, $2, $3, $4, $5)",
        [groupId, name, description, status, req.user.userId]
      );
      for (const phone of phoneNumbers) {
        let contactRes = await dbQuery(
          "SELECT id FROM contacts WHERE phone_number = $1 AND user_id = $2",
          [phone, req.user.userId]
        );
        let contactId;
        if (contactRes.rows.length === 0) {
          contactId = uuidv4();
          await dbQuery(
            "INSERT INTO contacts (id, name, phone_number, user_id) VALUES ($1, $2, $3, $4)",
            [contactId, name, phone, req.user.userId]
          );  
        } else {
          contactId = contactRes.rows[0].id;
        }
        await dbQuery(
          "INSERT INTO contacts_to_groups (contact_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [contactId, groupId]
        );
      }
      res.status(201).json({
        message: "success",
        group: { id: groupId, name, description, status, phoneNumbers },
      });
    } catch (err) {
      console.error("Error creating group", err);
      res.status(500).json({ error: "Failed to create group" });
    }
  },

  // Create a new group from CSV upload
  createGroupFromCSV: async (req, res) => {
    const { name } = req.body;
    const file = req.file;
    console.log("req.body--group->", req.body);
    console.log("file-->", file);
    if (!name || !file) {
      return res.status(400).json({ error: "Name and CSV file are required." });
    }
    try {
      const fileContent = fs.readFileSync(file.path, "utf-8");
      const phoneNumbers = fileContent
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      req.body.phoneNumbers = phoneNumbers;
      console.log("send the req-->", req.body);
      await groupManagementController.createGroup(req, res);
      fs.unlinkSync(file.path);
      res.json({message: "success"});
    } catch (err) {
      console.error("Error creating group from CSV", err);
      res.status(500).json({ error: "Failed to create group from CSV" });
    }
  },

  // Update group status (activate/deactivate)
  updateGroupStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const result = await dbQuery(
        "UPDATE contact_groups SET status = $1 WHERE id = $2 RETURNING *",
        [status, id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating group status", err);
      res.status(500).json({ error: "Failed to update status" });
    }
  },

  // Delete a group (and its links, but not contacts)
  deleteGroup: async (req, res) => {
    const { id } = req.params;
    try {
      await dbQuery("DELETE FROM contacts_to_groups WHERE group_id = $1", [id]);
      await dbQuery("DELETE FROM contact_groups WHERE id = $1", [id]);
      res.status(204).json({ message: "success" });
    } catch (err) {
      console.error("Error deleting group", err);
      res.status(500).json({ error: "Failed to delete group" });
    }
  },

  // Export/Download group as CSV
  downloadGroup: async (req, res) => {
    const { id } = req.params;
    try {
      const groupRes = await dbQuery(
        "SELECT * FROM contact_groups WHERE id = $1",
        [id]
      );
      const group = groupRes.rows[0];
      if (!group) return res.status(404).json({ error: "Group not found" });

      const contactsRes = await dbQuery(
        `SELECT c.phone_number FROM contacts c
                 JOIN contacts_to_groups cg ON c.id = cg.contact_id
                 WHERE cg.group_id = $1`,
        [id]
      );
      const csvData = [
        "Group Name,Description,Phone Number,Status",
        ...contactsRes.rows.map(
          (row) =>
            `"${group.name}","${group.description}","${row.phone_number}","${group.status}"`
        ),
      ].join("\n");
      const fileName = `group_${id}.csv`;
      const filePath = path.join(__dirname, "..", "..", "downloads", fileName);
      fs.writeFileSync(filePath, csvData);

      res.download(filePath, fileName, () => {
        fs.unlinkSync(filePath); // Clean up after download
      });
    } catch (err) {
      console.error("Error downloading group", err);
      res.status(500).json({ error: "Failed to download group" });
    }
  },
};

module.exports = groupManagementController;
