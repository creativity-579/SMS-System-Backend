const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middleware");
const senderIdsController = require("../../controller/admin/senderIds");

// List, filter, search, paginate
// router.get("/", authenticateToken, senderIdsController.index);
router.get("/", authenticateToken, senderIdsController.getAllSenderIds);

// Show detail
// router.get("/:id", authenticateToken, senderIdsController.show);
// Approve
router.put("/:id", authenticateToken, senderIdsController.updateStatus);

// Delete
router.delete("/:id", authenticateToken, senderIdsController.destroy);
// Bulk approve
router.post("/bulk/approve", authenticateToken, senderIdsController.bulkApprove);
// Bulk reject
router.post("/bulk/reject", authenticateToken, senderIdsController.bulkReject);
// Export
// router.get("/export/csv", authenticateToken, senderIdsController.export);

module.exports = router;