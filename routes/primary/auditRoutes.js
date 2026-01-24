const express = require("express");
const router = express.Router();
const controller = require("../../controllers/primary/auditController");
const { protect, authorizeRoles } = require("../../middlewares/authMiddleware");

router.use(protect);
router.get(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  controller.getPayrollAudits
);

module.exports = router;
