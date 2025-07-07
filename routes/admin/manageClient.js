const express = require("express");
const router = express.Router();
const { authenticateToken } = require('../../middleware');
const clientController = require('../../controller/admin/clientController');


router.get('/', clientController.getAllClients);
router.post('/', clientController.createClient);
// router.put('/:id', clientController.updateClient);
// router.delete('/:id', clientController.deleteClient);


module.exports = router;