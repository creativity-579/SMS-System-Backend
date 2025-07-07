const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors("*"));
app.use(express.json());

app.use("/api/admin", require("./routes/admin/authAdminRoutes"));
app.use("/api/admin",require("./routes/admin/manageClient"));

app.use("/uploads", express.static("uploads"));

app.use("/api/auth", require("./routes/admin/authAdminRoutes"));
app.use("/api/account", require("./routes/accountRoutes"));
app.use("/api/campaigns", require("./routes/campaignRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/groups", require("./routes/groupRoutes"));
app.use("/api/queue", require("./routes/queueRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/senders", require("./routes/senderIdRoutes"));
app.use("/api/sms", require("./routes/smsRoutes"));
app.use("/api/templates", require("./routes/templateRoutes"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;
