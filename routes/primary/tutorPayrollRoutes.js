const express = require("express");
const router = express.Router();

const controller = require("../../controllers/primary/tutorPayrollController");
const { protect, authorizeRoles } = require("../../middlewares/authMiddleware");

router.use(protect);
router.post(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  controller.saveTutorPayroll,
); // CREATE
router.put(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  controller.saveTutorPayroll,
); // UPDATE
router.get(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  controller.getTutorPayrolls,
); // GET ALL
router.get(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  controller.getTutorPayroll,
); // GET ONE
router.delete(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  controller.deleteTutorPayroll,
); // DELETE

module.exports = router;
