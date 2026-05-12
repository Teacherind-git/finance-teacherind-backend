const express = require("express");
const { protect, authorizeRoles } = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/staffUpload");
const router = express.Router();

router.use(protect);

const {
  createTutor,
  getTutors,
  getTutorById,
  updateTutor,
  deleteTutor,
  uploadDocuments
} = require("../../controllers/primary/tutorController");

// ======================================================
// ROUTES
// ======================================================

router.post(
  "/",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  upload.fields([{ name: "profilePhoto", maxCount: 1 }]),
  createTutor,
);

router.get("/", authorizeRoles("SuperAdmin", "Admin", "User"), getTutors);

router.get("/:id", authorizeRoles("SuperAdmin", "Admin", "User"), getTutorById);

router.put("/:id", authorizeRoles("SuperAdmin", "Admin", "User"), updateTutor);

router.delete(
  "/:id",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  deleteTutor,
);

router.post(
  "/:id/documents",
  authorizeRoles("SuperAdmin", "Admin", "User"),
  upload.fields([{ name: "documents", maxCount: 10 }]),
  uploadDocuments,
);

module.exports = router;
