const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require("../middleware/index");

router.get('/overview', authMiddleware, dashboardController.getDashboardStats);

module.exports = router;