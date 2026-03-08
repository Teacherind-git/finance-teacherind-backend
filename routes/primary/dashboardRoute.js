const express = require("express");
const router = express.Router();
const hrDashboardController = require("../../controllers/primary/dashboard/hrDashboardController");
const financeDashboardController = require("../../controllers/primary/dashboard/financeDashboard");
const adminDashboardController = require("../../controllers/primary/dashboard/adminDashboard");

router.get("/admin", adminDashboardController.getDashboard);
router.get("/hr", hrDashboardController.getDashboardStats);
router.get("/finance", financeDashboardController.getFinanceDashboard);

module.exports = router;
