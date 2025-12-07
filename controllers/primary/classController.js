const { sequelizePrimary } = require("../../config/db");
const Class = require("../../models/primary/Class");
const Subject = require("../../models/primary/Subject");
const Syllabus = require("../../models/primary/Syllabus");
const ClassRange = require("../../models/primary/ClassRange");
const logger = require("../../utils/logger");

// ✅ Get all classes
exports.getAllClasses = async (req, res) => {
  try {
    logger.info("Fetching all classes");

    const data = await Class.findAll();

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Error fetching classes", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ✅ Get all subjects
exports.getAllSubjects = async (req, res) => {
  try {
    logger.info("Fetching all subjects");

    const data = await Subject.findAll();

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Error fetching subjects", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ✅ Get all syllabus
exports.getAllSyllabus = async (req, res) => {
  try {
    logger.info("Fetching all syllabus");

    const data = await Syllabus.findAll();

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Error fetching syllabus", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ✅ Combined API (Classes + Subjects + Syllabus + ClassRanges)
exports.getAllData = async (req, res) => {
  try {
    logger.info("Fetching combined class, subject, syllabus & range data");

    const [classes, subjects, syllabus, classRanges] = await Promise.all([
      // ⭐ Sort classes numerically
      Class.findAll({
        order: [[sequelizePrimary.literal("CAST(number AS UNSIGNED)"), "ASC"]],
      }),

      // ⭐ Sort subjects alphabetically
      Subject.findAll({
        order: [["name", "ASC"]],
      }),

      // ⭐ Sort syllabus alphabetically
      Syllabus.findAll({
        order: [["name", "ASC"]],
      }),

      // ⭐ Sort class ranges logically
      ClassRange.findAll({
        order: [
          [sequelizePrimary.literal("CAST(fromClass AS UNSIGNED)"), "ASC"],
        ],
      }),
    ]);

    logger.info(
      `Fetched data counts → Classes: ${classes.length}, Subjects: ${subjects.length}, Syllabus: ${syllabus.length}, Ranges: ${classRanges.length}`
    );

    // ⭐ Clean subjects
    const cleanedSubjects = subjects.map((item) => ({
      ...item.toJSON(),
      name: item.name,
      content: item.content,
    }));

    // ⭐ Clean syllabus
    const cleanedSyllabus = syllabus.map((item) => ({
      ...item.toJSON(),
      name: item.name,
      content: item.content,
    }));

    // ⭐ Format class ranges for UI
    const formattedRanges = classRanges.map((r) => ({
      id: r.id,
      label: r.label, // e.g. "Class 1–4"
      fromClass: r.fromClass,
      toClass: r.toClass,
    }));

    res.status(200).json({
      success: true,
      classes,
      subjects: cleanedSubjects,
      syllabus: cleanedSyllabus,
      classRanges: formattedRanges,
    });
  } catch (error) {
    logger.error("Error fetching combined academic data", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
