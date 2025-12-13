const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../../middlewares/authMiddleware");
const {
  getAllFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getFeeManagementSummary,
  getAllFeeStructuresNoPagination,
} = require("../../controllers/primary/feeStructureController");

router.use(protect);
router.get("/", authorizeRoles("SuperAdmin", "Admin", "User"), getAllFeeStructures);
router.post("/", authorizeRoles("SuperAdmin"), createFeeStructure);
router.put("/:id", authorizeRoles("SuperAdmin"), updateFeeStructure);
router.delete("/:id", authorizeRoles("SuperAdmin"), deleteFeeStructure);
router.get(
  "/summary",
  authorizeRoles("SuperAdmin", "Admin"),
  getFeeManagementSummary
);
router.get("/all", authorizeRoles("SuperAdmin", "Admin", "User"), getAllFeeStructuresNoPagination);

module.exports = router;
