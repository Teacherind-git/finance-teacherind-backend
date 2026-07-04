const express = require("express");
const router = express.Router();

const { getPublicTutorDetails } = require("../../controllers/primary/tutorController");

// ======================================================
// PUBLIC ROUTES (NO AUTH)
// ======================================================

router.get("/", getPublicTutorDetails);

module.exports = router;
