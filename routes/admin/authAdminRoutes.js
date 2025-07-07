const express = require('express');
const router = express.Router();

const authAdminController = require("../../controller/admin/authAdmin");

router.post("/auth/login", authAdminController.loginAdmin);

module.exports = router;