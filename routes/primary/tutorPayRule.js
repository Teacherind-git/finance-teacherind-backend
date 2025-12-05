const express = require("express");
const router = express.Router();
const controller = require("../../controllers/primary/tutorPayRuleController");
const { protect, authorizeRoles } = require("../../middlewares/authMiddleware");

router.use(protect);
// PAY RULE
router.post("/payrule", authorizeRoles("SuperAdmin"), controller.savePayRule);
router.get("/payrule", authorizeRoles("SuperAdmin"), controller.getPayRuleData);

// BASE PAY
router.post("/basepay", authorizeRoles("SuperAdmin"), controller.createBasePay);
router.put(
  "/basepay/:id",
  authorizeRoles("SuperAdmin"),
  controller.updateBasePay
);
router.delete(
  "/basepay/:id",
  authorizeRoles("SuperAdmin"),
  controller.deleteBasePay
);
router.get("/basepay", authorizeRoles("SuperAdmin"), controller.getAllBasePays);

module.exports = router;
