const express = require("express");
const router = express.Router();
const packageController = require("../../controllers/primary/packageController");
const { protect, authorizeRoles } = require("../../middlewares/authMiddleware");

router.use(protect);
router.get(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  packageController.getAll
);
router.get("/:id", authorizeRoles("SuperAdmin"), packageController.getById);
router.post("/", authorizeRoles("SuperAdmin"), packageController.create);
router.put("/:id", authorizeRoles("SuperAdmin"), packageController.update);
router.delete("/:id", authorizeRoles("SuperAdmin"), packageController.delete);

module.exports = router;
