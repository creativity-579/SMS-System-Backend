const express = require("express");
const router = express.Router();
const senderIdController = require("../controller/client/senderId");
const { authenticateToken } = require("../middleware");


router.get("/", authenticateToken, senderIdController.getSenderIds);
router.post("/", authenticateToken, senderIdController.requestSenderId);
router.patch("/:id/status", authenticateToken, senderIdController.updateSenderIdStatus);

module.exports = router;
