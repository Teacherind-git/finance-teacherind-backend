const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../../middlewares/authMiddleware");
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getFinanceStaffUsers,
} = require("../../controllers/primary/userController");

router.use(protect);
router.get("/", authorizeRoles("SuperAdmin", "Admin", "User"), getAllUsers);
router.get(
  "/finance-staff",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  getFinanceStaffUsers
);
router.post("/", authorizeRoles("SuperAdmin", "User"), createUser);
router.put("/:id", authorizeRoles("SuperAdmin", "User"), updateUser);
router.delete("/:id", authorizeRoles("SuperAdmin", "User"), deleteUser);

module.exports = router;
