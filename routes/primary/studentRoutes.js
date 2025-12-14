// routes/studentRoutes.js

const express = require("express");
const router = express.Router();
const studentController = require("../../controllers/primary/studentController");
const studentBillController = require("../../controllers/primary/finance/studentBillController");
const { protect, authorizeRoles } = require('../../middlewares/authMiddleware');

router.use(protect);
router.post("/", authorizeRoles('SuperAdmin', 'Admin', 'User'),studentController.createStudent);
router.get("/", authorizeRoles('SuperAdmin', 'Admin', 'User'), studentController.getAllStudents);
router.get("/bills", authorizeRoles('SuperAdmin', 'Admin', 'User'), studentBillController.getStudentBills);
router.get("/:id", studentController.getStudent);
router.get("/invoice/:studentId", studentBillController.generateInvoicePdf);
router.put("/:id", studentController.updateStudent);
router.delete("/:id", studentController.deleteStudent);

module.exports = router;
