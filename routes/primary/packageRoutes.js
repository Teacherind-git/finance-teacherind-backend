const express = require("express");
const router = express.Router();
const packageController = require("../../controllers/primary/packageController");
const { protect, authorizeRoles } = require('../../middlewares/authMiddleware');

router.use(protect);
router.get("/", packageController.getAll);
router.get("/:id", packageController.getById);
router.post("/", authorizeRoles('SuperAdmin', 'Admin', 'User'), packageController.create);
router.put("/:id", packageController.update);
router.delete("/:id", packageController.delete);

module.exports = router;