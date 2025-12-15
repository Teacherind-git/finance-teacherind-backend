// routes/studentRoutes.js

const express = require("express");
const router = express.Router();
const studentController = require("../../controllers/primary/studentController");
const studentBillController = require("../../controllers/primary/finance/studentBillController");
const { protect, authorizeRoles } = require("../../middlewares/authMiddleware");

router.use(protect);
router.post(
  "/",
  authorizeRoles("SuperAdmin", "User"),
  studentController.createStudent
);
router.get(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  studentController.getAllStudents
);
router.get(
  "/bills",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  studentBillController.getStudentBills
);
router.get(
  "/summary",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  studentController.getStudentSummary
);
router.get(
  "/bill/summary",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  studentBillController.getStudentBillsSummary
);
router.get(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  studentController.getStudent
);
router.get(
  "/invoice/:studentId",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  studentBillController.generateInvoicePdf
);
router.put(
  "/:id",
  authorizeRoles("SuperAdmin", "User"),
  studentController.updateStudent
);
router.delete(
  "/:id",
  authorizeRoles("SuperAdmin", "User"),
  studentController.deleteStudent
);

module.exports = router;
