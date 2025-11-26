const express = require("express");
const router = express.Router();
const payRuleController = require("../../controllers/primary/tutorPayRuleController");

router.post("/", payRuleController.savePayRule);
router.get("/", payRuleController.getPayRule);

module.exports = router;