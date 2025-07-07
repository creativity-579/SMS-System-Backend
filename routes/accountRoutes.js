const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware");
const accountController = require("../controller/client/account");
const adminClientController = require("../controller/admin/clientController");

// router.get("/profile", authenticateToken, accountController.getProfile);
router.put("/profile", authenticateToken, accountController.updateProfile);
router.put("/password", authenticateToken, accountController.updatePassword);

module.exports = router;
