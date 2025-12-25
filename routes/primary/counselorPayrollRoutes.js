const express = require("express");
const router = express.Router();

const payrollController = require("../../controllers/primary/counselorPayrollController");
const { protect, authorizeRoles } = require("../../middlewares/authMiddleware");

router.use(protect);
// CREATE
router.post(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  payrollController.createOrUpdatePayroll
);
router.get(
  "/summary",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  payrollController.getCounselorPayrollSummary
);

// READ
router.get(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  payrollController.getCounselorPayrollList
);

// UPDATE
router.put(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  payrollController.updateCounselorPayroll
);

// DELETE (soft delete)
router.delete(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  payrollController.deleteCounselorPayroll
);

module.exports = router;
