const express = require('express');
const router = express.Router();
const templateController = require('../controller/client/template');
const {authenticateToken} = require("../middleware/index");

router.get('/', authenticateToken, templateController.getTemplates);
router.post('/', authenticateToken, templateController.createTemplate);
router.put('/:id', authenticateToken, templateController.updateTemplate);
router.delete('/:id', authenticateToken, templateController.deleteTemplate);
// router.get('/:id', authenticateToken, templateController.getTemplateById);

module.exports = router;