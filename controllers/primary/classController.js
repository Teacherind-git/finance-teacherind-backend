const Class = require("../../models/primary/Class");
const Subject = require("../../models/primary/Subject");
const Syllabus = require("../../models/primary/Syllabus");

// Get all classes
exports.getAllClasses = async (req, res) => {
  try {
    const data = await Class.findAll();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all subjects
exports.getAllSubjects = async (req, res) => {
  try {
    const data = await Subject.findAll();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all syllabus
exports.getAllSyllabus = async (req, res) => {
  try {
    const data = await Syllabus.findAll();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching syllabus:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Optional combined API
exports.getAllData = async (req, res) => {
  try {
    const [classes, subjects, syllabus] = await Promise.all([
      Class.findAll({ order: [["number", "ASC"]] }),
      Subject.findAll({ order: [["name", "ASC"]] }),
      Syllabus.findAll({ order: [["name", "ASC"]] }),
    ]);

    res.status(200).json({
      success: true,
      classes,
      subjects,
      syllabus,
    });
  } catch (error) {
    console.error("Error fetching all data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

