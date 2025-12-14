const router = require("express").Router();
const upload = require("../../middlewares/staffUpload");
const controller = require("../../controllers/primary/staffController");
const salaryController = require("../../controllers/primary/finance/staffSalaryController");
const { protect, authorizeRoles } = require("../../middlewares/authMiddleware");

router.use(protect);
// Create (Step-1)
router.post(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  upload.fields([{ name: "profilePhoto", maxCount: 1 }]),
  controller.createStaff
);

// Update (Step-2 or any partial update)
router.put(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  upload.none(),
  controller.updateStaff
);
router.put("/update-status/:id", salaryController.updateSalaryStatus);

// Upload documents (Step-3)
router.post(
  "/:id/documents",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  upload.fields([{ name: "documents", maxCount: 10 }]),
  controller.uploadDocuments
);

// Read
router.get("/", controller.getAllStaff);
router.get("/tutors", controller.getAllTutors);
router.get("/counselors", controller.getAllCounselors);
router.get("/salary", salaryController.getAllSalaries);
router.get("/:id", controller.getStaff);

// Delete
router.delete(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  controller.deleteStaff
);
router.delete(
  "/document/:docId",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  controller.deleteDocument
);

module.exports = router;
