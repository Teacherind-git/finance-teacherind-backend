const express = require("express");
const router = express.Router();

const payrollController = require("../../controllers/primary/staffPayrollController");
const { protect, authorizeRoles } = require('../../middlewares/authMiddleware');

router.use(protect);
// CREATE
router.post(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  payrollController.createPayroll
);

// READ
router.get(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  payrollController.getAllPayrolls
);
router.get(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  payrollController.getPayrollById
);

// UPDATE
router.put(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  payrollController.updatePayroll
);

// DELETE (soft delete)
router.delete(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  payrollController.deletePayroll
);

module.exports = router;
