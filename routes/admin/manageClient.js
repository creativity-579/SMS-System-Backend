const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middleware");
const clientController = require("../../controller/admin/clientController");

router.get("/", authenticateToken, clientController.getAllClients);
router.post("/", authenticateToken, clientController.createClient);
router.put("/:id", authenticateToken, clientController.updateClient);
// router.delete("/:id", authenticateToken, clientController.deleteClient);

module.exports = router;
