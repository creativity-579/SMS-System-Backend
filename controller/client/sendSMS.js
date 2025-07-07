const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { dbQuery } = require("../../db/index");
const { v4: uuidv4 } = require("uuid");

const smsController = {
  sendQuickSMS: async (req, res) => {
    try {
      const { phoneNumbers, message, messageType, senderId } = req.body;
      const userId = req.user.userId;

      if (!phoneNumbers || !message || !senderId || !messageType) {
        return res.status(400).json({
          error:
            "Phone numbers, message, messageType, and Sender ID are required.",
        });
      }

      let numbersArray = [];
      if (Array.isArray(phoneNumbers)) {
        numbersArray = phoneNumbers
          .map((num) => String(num).trim())
          .filter(Boolean);
      } else if (typeof phoneNumbers === "string") {
        numbersArray = phoneNumbers
          .split("\n")
          .map((num) => num.trim())
          .filter(Boolean);
      }

      if (numbersArray.length === 0) {
        return res
          .status(400)
          .json({ error: "No valid phone numbers provided." });
      }

      const jobId = uuidv4();
      await dbQuery(
        `INSERT INTO bulk_sms_jobs (id, user_id, sender_id, message)
         VALUES ($1, $2, $3, $4)`,
        [jobId, userId, senderId, message]
      );

      const values = [];
      const placeholders = [];
      numbersArray.forEach((phone, i) => {
        values.push(
          uuidv4(), // id
          userId, // user_id
          phone, // phone_number
          message, // message
          messageType, // messageType
          "queued", // status
          senderId, // sender_id
          jobId // job_id
        );
        const idx = i * 8;
        placeholders.push(
          `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${
            idx + 6
          }, $${idx + 7}, $${idx + 8})`
        );
      });

      console.log("passed this way");

      await dbQuery(
        `INSERT INTO messages (id, user_id, phone_number, message, type, status, sender_id, job_id)
         VALUES ${placeholders.join(", ")}`,
        values
      );
      console.log("==============");

      res.status(201).json({
        message: "success",
        job_id: jobId,
        recipients: numbersArray.length,
      });
    } catch (err) {
      console.error("Error sending quick SMS:", err);
      res.status(500).json({ error: "Failed to send quick SMS" });
    }
  },

  sendBulkSMS: async (req, res) => {
    try {
      const {
        groups,
        message,
        messageType,
        senderId,
        scheduleType,
        scheduleDate,
        scheduleTime,
      } = req.body;
      const userId = req.user.userId;

      if (!groups || !groups.length || !message || !senderId || !messageType) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      let schedule_at = null;
      if (scheduleType === "schedule" && scheduleDate && scheduleTime) {
        schedule_at = new Date(`${scheduleDate}T${scheduleTime}`);
      }

      // 1. Create a bulk_sms_job
      const jobId = uuidv4();
      await dbQuery(
        `INSERT INTO bulk_sms_jobs (id, user_id, sender_id, message, schedule_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [jobId, userId, senderId, message, schedule_at]
      );

      // 2. Get all contacts in the selected groups (UUIDs)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const validGroups = (groups || []).filter(
        (gid) => gid && uuidRegex.test(gid)
      );
      if (!validGroups.length) {
        return res.status(400).json({ error: "No valid group IDs provided." });
      }

      const contactsRes = await dbQuery(
        `SELECT DISTINCT c.phone_number
         FROM contacts c
         JOIN contacts_to_groups cg ON c.id = cg.contact_id
         WHERE cg.group_id = ANY($1)`,
        [validGroups]
      );
      const phoneNumbers = contactsRes.rows.map((row) => row.phone_number);

      if (phoneNumbers.length === 0) {
        return res
          .status(400)
          .json({ error: "No recipients found in selected groups." });
      }

      // 3. Bulk insert messages (with messageType)
      const values = [];
      const placeholders = [];
      phoneNumbers.forEach((phone, i) => {
        values.push(
          uuidv4(), // id
          userId, // user_id
          phone, // phone_number
          message, // message
          messageType, // messageType
          schedule_at, // scheduled_at
          "queued", // status
          senderId, // sender_id
          jobId // job_id
        );
        const idx = i * 9;
        placeholders.push(
          `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${
            idx + 6
          }, $${idx + 7}, $${idx + 8}, $${idx + 9})`
        );
      });

      await dbQuery(
        `INSERT INTO messages (id, user_id, phone_number, message, type, scheduled_at, status, sender_id, job_id)
         VALUES ${placeholders.join(", ")}`,
        values
      );

      // 4. Return summary
      res.status(201).json({
        message: "success",
        job_id: jobId,
        groups: validGroups.length,
        recipients: phoneNumbers.length,
        sms_parts: 1,
        total_cost: 0,
      });
    } catch (err) {
      console.error("Error sending bulk SMS:", err);
      res.status(500).json({ error: "Failed to send bulk SMS" });
    }
  },

  sendFromFile: async (req, res) => {
    const { sender_id, message } = req.body;
    const user_id = req.user.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const ext = path.extname(file.originalname).toLowerCase();
      let phoneNumbers = [];

      const fileContent = fs.readFileSync(file.path, "utf-8");

      if (ext === ".txt") {
        phoneNumbers = fileContent
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
      } else if (ext === ".csv") {
        const records = parse(fileContent, {
          columns: false,
          skip_empty_lines: true,
        });
        phoneNumbers = records.flat().map((phone) => phone.trim());
      } else {
        return res.status(400).json({ error: "Unsupported file format" });
      }

      if (phoneNumbers.length === 0) {
        return res.status(400).json({ error: "No valid phone numbers found" });
      }

      // 1. Create job
      const jobId = uuidv4();
      await dbQuery(
        `INSERT INTO bulk_sms_jobs (id, user_id, sender_id, message)
             VALUES ($1, $2, $3, $4)`,
        [jobId, user_id, sender_id, message]
      );

      const status = 'queued';

      // 2. Insert messages
      const insertQuery = `
        INSERT INTO messages (id, user_id, phone_number, message, status, sender_id, job_id)
        VALUES
        ${phoneNumbers
          .map(
            (_, i) =>
              `($${i * 7 + 1}::uuid, $${i * 7 + 2}::uuid, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7}::uuid)`
          )
          .join(", ")}
      `;

      const insertValues = phoneNumbers.flatMap((phone) => [
        uuidv4(), 
        user_id,  
        phone,    
        message,  
        status,   
        sender_id,
        jobId,    
      ]);

      await dbQuery(insertQuery, insertValues);

      fs.unlinkSync(file.path);

      res.status(201).json({
        message: "success",
        job_id: jobId,
        total_messages: phoneNumbers.length,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to process file and send SMS" });
    }
  },
};

module.exports = smsController;
