const express = require("express");
const router = express.Router();
const {
  createNotification,
  getNotifications,
  acknowledgeNotification,
} = require("../../controllers/primary/notificationController");
const {
  protect,
  authorizeRoles,
} = require("../../middlewares/authMiddleware");

router.use(protect);
router.post("/", authorizeRoles("SuperAdmin", "Admin"), createNotification);
router.use(authorizeRoles("SuperAdmin", "Admin", "User"));
router.get("/", getNotifications);
router.delete("/:id", acknowledgeNotification);

module.exports = router;