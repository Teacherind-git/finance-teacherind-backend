const express = require("express");
const router = express.Router();

const payrollController = require("../../controllers/primary/counselorPayrollController");
const { protect, authorizeRoles } = require('../../middlewares/authMiddleware');

router.use(protect);
// CREATE
router.post(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  payrollController.createOrUpdatePayroll
);

// READ
router.get(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  payrollController.getCounselorPayrollList
);

module.exports = router;
