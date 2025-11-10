const express = require("express");
const router = express.Router();
const {
  getAllClasses,
  getAllSubjects,
  getAllSyllabus,
  getAllData,
} = require("../../controllers/primary/classController");

router.get("/", getAllClasses);
router.get("/subjects", getAllSubjects);
router.get("/syllabus", getAllSyllabus);
router.get("/all", getAllData); 

module.exports = router;
