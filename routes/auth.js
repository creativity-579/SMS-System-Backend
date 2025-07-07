const express = require('express');
const router = express.Router();
const autherController = require('../controller/auth');

router.post('/login', autherController.login);
router.post('/refresh', autherController.refreshToken);

module.exports = router;
