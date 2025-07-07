const express = require("express");
const app = express();
const cors = require("cors");
const port = 4001;
require("dotenv").config;

const db = require("./db");

// Middleware
app.use(cors("*"));
app.use(express.json());

// Mount routes
app.use("/api/auth", require("./routes/auth"));

//admin routes
app.use("/api/admin/clients", require("./routes/admin/manageClient"));
app.use("/api/admin/senderIds", require("./routes/admin/senderIds"))
app.use("/api/admin/templates", require("./routes/admin/templates"))

//client routes
app.use("/api/groups", require("./routes/groupRoutes"));
app.use("/api/templates", require("./routes/templateRoutes"));
app.use("/api/sender-ids", require("./routes/senderIdRoutes"));
app.use("/api/campaigns", require("./routes/campaignRouts"));
app.use("/api/sms", require("./routes/smsRoutes"));
app.use("/api/queue", require("./routes/queueRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/account", require("./routes/accountRoutes"));

(async () => {
  try {
    await db.dbConnect();
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server due to DB connection error.");
    process.exit(1);
  }
})();
