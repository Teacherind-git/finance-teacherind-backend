const express = require("express");
const router = express.Router();
const payRuleController = require("../../controllers/primary/tutorPayRuleController");
const { protect, authorizeRoles } = require('../../middlewares/authMiddleware');

router.use(protect);
router.post(
  "/payrule",
  authorizeRoles("SuperAdmin"),
  payRuleController.updatePayRules
);
router.get("/payrule", authorizeRoles("SuperAdmin"), payRuleController.getBasePays);

router.get(
  "/basepay",
  authorizeRoles("SuperAdmin"),
  payRuleController.getBasePays
);
router.post(
  "/basepay",
  authorizeRoles("SuperAdmin"),
  payRuleController.createBasePay
);
router.put(
  "/basepay/:id",
  authorizeRoles("SuperAdmin"),
  payRuleController.updateBasePay
);
router.delete(
  "/basepay/:id",
  authorizeRoles("SuperAdmin"),
  payRuleController.deleteBasePay
);

module.exports = router;
