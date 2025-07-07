const express = require("express");
const router = express.Router();
const groupController = require("../controller/client/groupManagement");
const { authenticateToken } = require("../middleware/index");

const multer = require("multer");
const upload = multer({dest: 'uploads/'});

router.get("/", authenticateToken, groupController.getGroups);
router.post("/", authenticateToken, groupController.createGroup);
router.post("/file", authenticateToken,  upload.single('file'), groupController.createGroupFromCSV)
// router.get("/:id", authenticateToken, groupController.getGroupById);
// router.put("/:id", authenticateToken, groupController.updateGroup);
router.delete("/:id", authenticateToken, groupController.deleteGroup);

module.exports = router;
