const express = require('express');
const router = express.Router();
const reportController = require('../controller/client/report');
const {authenticateToken} = require("../middleware/index");


router.get('/', authenticateToken, reportController.getDeliveryReports);

module.exports = router;