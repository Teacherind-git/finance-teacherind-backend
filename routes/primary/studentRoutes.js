// routes/studentRoutes.js

const express = require("express");
const router = express.Router();
const studentController = require("../../controllers/primary/studentController");
const studentBillController = require("../../controllers/primary/finance/studentBillController");
const secondaryStudentBillController = require("../../controllers/primary/finance/secondaryStudentBillController");
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
  "/secondary-bills",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  secondaryStudentBillController.getAllBills
);
router.get(
  "/secondary-bills/summary",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  secondaryStudentBillController.getBillsSummary
);
router.put(
  "/secondary-bills/:id/mark-paid",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  secondaryStudentBillController.markBillPaid
);
router.get(
  "/secondary-bills/invoice/:studentId",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  secondaryStudentBillController.generateInvoicePdf
);
router.get(
  "/secondary-bills/receipt/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  secondaryStudentBillController.downloadReceipt
);
router.get(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  studentController.getStudent
);
router.get(
  "/:id/bill",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  secondaryStudentBillController.getBills
);
router.post(
  "/:id/bill",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  secondaryStudentBillController.generateBill
);
router.get(
  "/receipt/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  studentBillController.downloadReceipt
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

router.put(
  "/bill/:id/mark-paid",
  studentBillController.markStudentBillPaid
);

router.delete(
  "/:id",
  authorizeRoles("SuperAdmin", "User"),
  studentController.deleteStudent
);

module.exports = router;
