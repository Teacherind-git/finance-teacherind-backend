const FeeStructure = require("../../models/primary/FeeStructure");
const Subject = require("../../models/primary/Subject");
const Syllabus = require("../../models/primary/Syllabus");
const User = require("../../models/primary/User");
const Package = require("../../models/primary/Package");
const TutorPay = require("../../models/primary/TutorPayRule");

const { Op } = require("sequelize");

exports.getAllFeeStructures = async (req, res) => {
  try {
    const { subject, syllabus, addedBy, search } = req.query; // <-- filters from frontend

    // Build a dynamic filter (Sequelize "where" object)
    const whereClause = {};

    if (subject) {
      whereClause.subject = subject;
    }

    if (syllabus) {
      whereClause.syllabus = syllabus;
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
    const [subjects, syllabuses, users] = await Promise.all([
      Subject.findAll({ attributes: ["id", "name"] }),
      Syllabus.findAll({ attributes: ["id", "name"] }),
      User.findAll({ attributes: ["id", "firstName", "lastName"] }),
    ]);

    // Create lookup maps
    const subjectMap = subjects.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    const syllabusMap = syllabuses.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    const userMap = users.reduce((acc, u) => {
      acc[u.id] = `${u.firstName}${u.lastName ? " " + u.lastName : ""}`;
      return acc;
    }, {});

    // Enrich FeeStructure data with names
    const enrichedData = data.map((item) => ({
      ...item.toJSON(),
      subjectDisplay: subjectMap[item.subject] || "Unknown Subject",
      syllabusDisplay: syllabusMap[item.syllabus] || "Unknown Syllabus",
      addedByDisplay: userMap[item.addedBy] || "Unknown User",
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
    // Extract user info from token
    const addedBy = req.user?.id;

    if (!addedBy) {
      return res
        .status(400)
        .json({ message: "Unauthorized: Missing user info" });
    }

    // Include addedBy in the record
    const payload = {
      ...req.body,
      addedBy,
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
    await FeeStructure.update(req.body, { where: { id } });
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

    // Calculate Average Tutor Pay
    // const tutorPays = await TutorPay.findAll({
    //   attributes: ["percentage"],
    //   raw: true,
    // });

    // let avgTutorPay = 0;
    // if (tutorPays.length > 0) {
    //   const total = tutorPays.reduce(
    //     (sum, item) => sum + parseFloat(item.percentage || 0),
    //     0
    //   );
    //   avgTutorPay = (total / tutorPays.length).toFixed(2);
    // }

    return res.status(200).json({
      feeStructures: feeStructureCount,
      packages: packageCount,
    });
  } catch (error) {
    console.error("Error fetching fee summary:", error);
    return res.status(500).json({ message: "Server Error", error });
  }
};
