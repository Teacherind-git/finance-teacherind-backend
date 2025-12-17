const express = require("express");
const router = express.Router();
const financeController = require("../../controllers/primary/finance/financeController");
const { protect, authorizeRoles } = require("../../middlewares/authMiddleware");

router.use(protect);
router.get(
  "/summary",
  authorizeRoles("SuperAdmin"),
  financeController.getFinanceSummary
);
router.post(
  "/transactions",
  authorizeRoles("SuperAdmin", "User"),
  financeController.searchFinanceTransactions
);

module.exports = router;