const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require('../../middlewares/authMiddleware');
const {
  getAllFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
} = require("../../controllers/primary/feeStructureController");

router.use(protect);
router.get("/", getAllFeeStructures);
router.post("/", authorizeRoles("SuperAdmin", "Admin"), createFeeStructure);
router.put("/:id", authorizeRoles("SuperAdmin", "Admin"), updateFeeStructure);
router.delete(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin"),
  deleteFeeStructure
);

module.exports = router;
