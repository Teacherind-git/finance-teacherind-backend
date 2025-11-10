const FeeStructure = require("../../models/primary/FeeStructure");
const Subject = require("../../models/primary/Subject");
const Syllabus = require("../../models/primary/Syllabus");
const User = require("../../models/primary/User");

exports.getAllFeeStructures = async (req, res) => {
  try {
    // Fetch all fee structures ordered by last update
    const data = await FeeStructure.findAll({
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
