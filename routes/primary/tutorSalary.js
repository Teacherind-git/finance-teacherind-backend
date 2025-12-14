const express = require("express");
const router = express.Router();

const salaryController = require("../../controllers/primary/finance/tutorSalaryController");
const { protect, authorizeRoles } = require('../../middlewares/authMiddleware');

router.use(protect);
// READ
router.get(
  "/salary",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  salaryController.getAllTutorSalaries
);
router.get("/salary/non-assigned", salaryController.getNonAssignedTutorSalaries);
//Update
router.put(
  "/salary/assign",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  salaryController.assignTutorSalaries
);
router.put(
  "/salary/update-status/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  salaryController.updateTutorSalaryStatus
);


module.exports = router;
