const express = require('express');
const router = express.Router();
const queueMessageController = require('../controller/client/queue');
const { authenticateToken } = require("../middleware");

router.get('/', authenticateToken, queueMessageController.getQueuedMessages);
// router.get('/:id', authenticateToken, queueMessageController.getMessageDetails);
router.put('/:id', authenticateToken, queueMessageController.retryMessage);
router.delete('/:id', authenticateToken, queueMessageController.deleteMessage);

module.exports = router;