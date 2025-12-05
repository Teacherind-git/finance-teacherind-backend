const { sequelizePrimary } = require("../../config/db");
const Class = require("../../models/primary/Class");
const Subject = require("../../models/primary/Subject");
const Syllabus = require("../../models/primary/Syllabus");
const ClassRange = require("../../models/primary/ClassRange");

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
    const [classes, subjects, syllabus, classRanges] = await Promise.all([
      // ⭐ Sort classes by number (numeric sort)
      Class.findAll({
        order: [[sequelizePrimary.literal("CAST(number AS UNSIGNED)"), "ASC"]],
      }),

      // ⭐ Sort subjects
      Subject.findAll({
        order: [["name", "ASC"]],
      }),

      // ⭐ Sort syllabus
      Syllabus.findAll({
        order: [["name", "ASC"]],
      }),

      // ⭐ NEW → Fetch class ranges sorted logically
      ClassRange.findAll({
        order: [
          [sequelizePrimary.literal("CAST(fromClass AS UNSIGNED)"), "ASC"],
        ],
      }),
    ]);

    // ⭐ Clean unwanted fields (if any)
    const cleanedSubjects = subjects.map((item) => ({
      ...item.toJSON(),
      name: item.name,
      content: item.content,
    }));

    const cleanedSyllabus = syllabus.map((item) => ({
      ...item.toJSON(),
      name: item.name,
      content: item.content,
    }));

    // ⭐ Format class ranges to match UI needs
    const formattedRanges = classRanges.map((r) => ({
      id: r.id,
      label: r.label, // Example: "Class 1–4"
      fromClass: r.fromClass,
      toClass: r.toClass,
    }));

    res.status(200).json({
      success: true,
      classes,
      subjects: cleanedSubjects,
      syllabus: cleanedSyllabus,
      classRanges: formattedRanges, // ⭐ add here
    });
  } catch (error) {
    console.error("Error fetching all data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
