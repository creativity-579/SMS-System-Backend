const express = require('express');
const router = express.Router();
const campaignController = require('../controller/client/campaign');
const {authenticateToken} = require("../middleware/index");


router.get('/', authenticateToken, campaignController.getCampaigns);
router.post('/', authenticateToken,  campaignController.createCampaign);
router.put('/:id', authenticateToken, campaignController.updateCampaign);
router.delete('/:id', authenticateToken, campaignController.deleteCampaign);
router.patch("/:id/pause", authenticateToken, campaignController.pauseCampaign);
router.patch("/:id/resume", authenticateToken, campaignController.resumeCampaign);

module.exports = router;