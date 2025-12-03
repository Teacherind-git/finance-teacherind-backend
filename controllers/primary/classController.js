const { sequelizePrimary } = require("../../config/db");
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
      // ⭐ Force sorting as NUMBER even if DB stores as STRING
      Class.findAll({
        order: [[sequelizePrimary.literal("CAST(number AS UNSIGNED)"), "ASC"]],
      }),

      Subject.findAll({
        order: [["name", "ASC"]],
      }),

      Syllabus.findAll({
        order: [["name", "ASC"]],
      }),
    ]);

    // ⭐ Clean unwanted syllabus & subject text formatting
    const cleanedSubjects = subjects.map((item) => ({
      ...item.toJSON(),
      name: removeQuotes(item.name),
      content: removeQuotes(item.content),
    }));
    const cleanedSyllabus = syllabus.map((item) => ({
      ...item.toJSON(),
      name: removeQuotes(item.name),
      content: removeQuotes(item.content),
    }));

    res.status(200).json({
      success: true,
      classes,
      subjects: cleanedSubjects,
      syllabus: cleanedSyllabus,
    });
  } catch (error) {
    console.error("Error fetching all data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🧽 Remove ALL quotes from string
function removeQuotes(str) {
  if (!str) return str;

  return String(str)
    .replace(/["']/g, "") // remove all " and '
    .replace(/\\"/g, "") // remove escaped quotes
    .replace(/\\'/g, "") // remove escaped single quotes
    .trim();
}
