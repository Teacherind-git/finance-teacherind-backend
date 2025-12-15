const express = require("express");
const router = express.Router();
const expenseController = require("../../controllers/primary/expenseController");
const { protect, authorizeRoles } = require("../../middlewares/authMiddleware");

router.use(protect);
router.post(
  "/",
  authorizeRoles("SuperAdmin", "User"),
  expenseController.createExpense
); // Create
router.get(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  expenseController.getAllExpenses
); // Read all
router.get(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  expenseController.getExpenseById
); // Read one
router.put(
  "/:id",
  authorizeRoles("SuperAdmin", "User"),
  expenseController.updateExpense
); // Update
router.delete(
  "/:id",
  authorizeRoles("SuperAdmin", "User"),
  expenseController.deleteExpense
); // Delete

module.exports = router;
