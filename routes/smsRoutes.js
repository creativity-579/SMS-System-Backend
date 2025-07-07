const express = require("express");
const router = express.Router();

const smsController = require("../controller/client/sendSMS");
const { authenticateToken } = require("../middleware/index");

const multer = require("multer");
const upload = multer({ dest: 'uploads/' });

router.post("/quick", authenticateToken, smsController.sendQuickSMS);
router.post("/bulk", authenticateToken, smsController.sendBulkSMS);
router.post("/file", authenticateToken, upload.single("file"), smsController.sendFromFile);
// router.get("/queued", smsController.getQueuedMessages);
// router.get("/reports", smsController.getDeliveryReports);

module.exports = router;
