const FeeStructure = require("../../models/primary/FeeStructure");
const Subject = require("../../models/primary/Subject");
const User = require("../../models/primary/User");
const Package = require("../../models/primary/Package");
const ClassRange = require("../../models/primary/ClassRange");

const { Op } = require("sequelize");

exports.getAllFeeStructures = async (req, res) => {
  try {
    const { subject, addedBy, search } = req.query; // <-- filters from frontend

    // Build a dynamic filter (Sequelize "where" object)
    const whereClause = {};

    if (subject) {
      whereClause.subjectId = subject;
    }

    if (addedBy) {
      whereClause.addedBy = addedBy;
    }

    // Optional search filter on name or description (if you have those fields)
    if (search) {
      whereClause[Op.or] = [{ feePerHour: { [Op.like]: `%${search}%` } }];
    }

    // Fetch filtered fee structures ordered by last update
    const data = await FeeStructure.findAll({
      where: whereClause,
      order: [["updatedAt", "DESC"]],
    });

    // Fetch subjects, syllabuses, and users
    const [subjects, users, class_ranges] = await Promise.all([
      Subject.findAll({ attributes: ["id", "name"] }),
      User.findAll({ attributes: ["id", "firstName", "lastName"] }),
      ClassRange.findAll({ attributes: ["id", "label"] }),
    ]);

    // Create lookup maps
    const subjectMap = subjects.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    const userMap = users.reduce((acc, u) => {
      acc[u.id] = `${u.firstName}${u.lastName ? " " + u.lastName : ""}`;
      return acc;
    }, {});

    const classRangeMap = class_ranges.reduce((acc, u) => {
      acc[u.id] = u.label;
      return acc;
    }, {});

    // Enrich FeeStructure data with names
    const enrichedData = data.map((item) => ({
      ...item.toJSON(),
      subjectDisplay: subjectMap[item.subjectId] || "Unknown Subject",
      addedByDisplay: userMap[item.addedBy] || "Unknown User",
      classDisplay: classRangeMap[item.classRangeId] || "Unknown Class",
    }));

    res.json(enrichedData);
  } catch (err) {
    console.error("Error fetching fee structures:", err);
    res.status(500).json({ message: "Failed to fetch fee structures" });
  }
};

// ✅ Create
exports.createFeeStructure = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(400)
        .json({ message: "Unauthorized: Missing user info" });
    }

    const payload = {
      ...req.body,
      addedBy: userId,
      createdBy: userId,
      updatedBy: userId, // optional but recommended
    };

    const newRecord = await FeeStructure.create(payload);
    res.status(201).json(newRecord);
  } catch (err) {
    console.error("Create error:", err);
    res.status(500).json({ message: "Failed to create record" });
  }
};

// ✅ Update
exports.updateFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(400)
        .json({ message: "Unauthorized: Missing user info" });
    }

    const payload = {
      ...req.body,
      updatedBy: userId, // 👈 always set updatedBy
    };

    const [updated] = await FeeStructure.update(payload, { where: { id } });

    if (!updated) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json({ message: "Updated successfully" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Failed to update record" });
  }
};

// ✅ Delete
exports.deleteFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;
    await FeeStructure.destroy({ where: { id } });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Failed to delete record" });
  }
};

// Count
exports.getFeeManagementSummary = async (req, res) => {
  try {
    // Count Fee Structures
    const feeStructureCount = await FeeStructure.count();

    // Count Packages
    const packageCount = await Package.count();

    /**
     * ⚠️ Replace this block with real stats from DB
     * Example source:
     * - TutorAttendance
     * - ClassLogs
     * - TutorSessions
     */
    const tutorStats = {
      totalClasses: 100,
      onTimeClasses: 80,
      missedClasses: 20,
    };

    const averageTutorPayPercentage =
      calculateAverageTutorPayPercent(tutorStats);

    return res.status(200).json({
      feeStructures: feeStructureCount,
      packages: packageCount,
      averageTutorPayPercentage, // ✅ added here
    });
  } catch (error) {
    console.error("Error fetching fee summary:", error);
    return res.status(500).json({ message: "Server Error", error });
  }
};

function calculateAverageTutorPayPercent({
  totalClasses,
  onTimeClasses,
  missedClasses,
}) {
  const THRESHOLD = Number(process.env.CLASS_THRESHOLD);
  const INC_PERCENT = Number(process.env.INCREMENT_PERCENT);
  const DEC_PERCENT = Number(process.env.DECREMENT_PER_MISSED);

  let increment = 0;

  if (totalClasses >= THRESHOLD && totalClasses > 0) {
    increment = (onTimeClasses / totalClasses) * INC_PERCENT;
  }

  const decrement = missedClasses * DEC_PERCENT;

  let percent = 100 + increment - decrement;
  percent = Math.max(0, percent); // safety

  return Number(percent.toFixed(2));
}
