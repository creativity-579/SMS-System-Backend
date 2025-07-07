const express = require("express");
const  router = express.Router();
const { authenticateToken } = require("../../middleware");
const templateController = require("../../controller/admin/templateController");

router.get("/", authenticateToken, templateController.getAllTemplates);
router.put("/:id", authenticateToken, templateController.updateStatus);

module.exports = router;