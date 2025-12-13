const FeeStructure = require("../../models/primary/FeeStructure");
const Subject = require("../../models/primary/Subject");
const User = require("../../models/primary/User");
const Package = require("../../models/primary/Package");
const ClassRange = require("../../models/primary/ClassRange");
const logger = require("../../utils/logger");

const { Op } = require("sequelize");

// ✅ Get all Fee Structures (with filters)
exports.getAllFeeStructures = async (req, res) => {
  try {
    const {
      subject,
      addedBy,
      search,
      classRange,
      page = 1,
      limit = 10,
      sortBy = "updatedAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    logger.info("Fetching fee structures", {
      subject,
      addedBy,
      search,
      classRange,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    const whereClause = {
      isDeleted: false,
    };

    if (subject) whereClause.subjectId = subject;
    if (addedBy) whereClause.addedBy = addedBy;
    if (classRange) whereClause.classRangeId = classRange;

    if (search) {
      whereClause[Op.or] = [{ feePerHour: { [Op.like]: `%${search}%` } }];
    }

    /** ✅ Paginated query */
    const { rows, count } = await FeeStructure.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]],
    });

    /** ✅ Lookup data */
    const [subjects, users, class_ranges] = await Promise.all([
      Subject.findAll({ attributes: ["id", "name"] }),
      User.findAll({ attributes: ["id", "firstName", "lastName"] }),
      ClassRange.findAll({ attributes: ["id", "label"] }),
    ]);

    const subjectMap = subjects.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    const userMap = users.reduce((acc, u) => {
      acc[u.id] = `${u.firstName}${u.lastName ? " " + u.lastName : ""}`;
      return acc;
    }, {});

    const classRangeMap = class_ranges.reduce((acc, r) => {
      acc[r.id] = r.label;
      return acc;
    }, {});

    const enrichedData = rows.map((item) => ({
      ...item.toJSON(),
      subjectDisplay: subjectMap[item.subjectId] || "Unknown Subject",
      addedByDisplay: userMap[item.addedBy] || "Unknown User",
      classDisplay: classRangeMap[item.classRangeId] || "Unknown Class",
    }));

    logger.info(`Fee structures fetched: ${enrichedData.length}`);

    res.json({
      data: enrichedData,
      pagination: {
        totalRecords: count,
        currentPage: Number(page),
        pageSize: Number(limit),
        totalPages: Math.ceil(count / limit),
        sortBy,
        sortOrder,
      },
    });
  } catch (err) {
    logger.error("Error fetching fee structures", err);
    res.status(500).json({ message: "Failed to fetch fee structures" });
  }
};

// ✅ Create Fee Structure
exports.createFeeStructure = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      logger.warn("Create fee structure failed: Missing user info");
      return res
        .status(400)
        .json({ message: "Unauthorized: Missing user info" });
    }

    const payload = {
      ...req.body,
      addedBy: userId,
      createdBy: userId,
      updatedBy: userId,
    };

    const newRecord = await FeeStructure.create(payload);

    logger.info(`Fee structure created`, {
      id: newRecord.id,
      createdBy: userId,
    });

    res.status(201).json(newRecord);
  } catch (err) {
    logger.error("Error creating fee structure", err);
    res.status(500).json({ message: "Failed to create record" });
  }
};

// ✅ Update Fee Structure
exports.updateFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      logger.warn("Update fee structure failed: Missing user info");
      return res
        .status(400)
        .json({ message: "Unauthorized: Missing user info" });
    }

    const payload = {
      ...req.body,
      updatedBy: userId,
    };

    const [updated] = await FeeStructure.update(payload, {
      where: { id },
    });

    if (!updated) {
      logger.warn(`Fee structure not found for update: ${id}`);
      return res.status(404).json({ message: "Record not found" });
    }

    logger.info(`Fee structure updated`, {
      id,
      updatedBy: userId,
    });

    res.json({ message: "Updated successfully" });
  } catch (err) {
    logger.error("Error updating fee structure", err);
    res.status(500).json({ message: "Failed to update record" });
  }
};

// ✅ Delete Fee Structure
exports.deleteFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Soft deleting fee structure", { id });

    const feeStructure = await FeeStructure.findOne({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!feeStructure) {
      logger.warn(`Fee structure not found for delete: ${id}`);
      return res.status(404).json({ message: "Record not found" });
    }

    await feeStructure.update({
      isDeleted: true,
      updatedBy: req.user?.id || null, // ✅ audit (optional)
    });

    logger.info("Fee structure soft deleted", { id });

    res.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    logger.error("Error soft deleting fee structure", err);
    res.status(500).json({ message: "Failed to delete record" });
  }
};

// ✅ Fee Management Summary
exports.getFeeManagementSummary = async (req, res) => {
  try {
    logger.info("Fetching fee management summary");

    const feeStructureCount = await FeeStructure.count();
    const packageCount = await Package.count();

    const tutorStats = {
      totalClasses: 100,
      onTimeClasses: 80,
      missedClasses: 20,
    };

    const averageTutorPayPercentage =
      calculateAverageTutorPayPercent(tutorStats);

    logger.info("Fee summary generated", {
      feeStructureCount,
      packageCount,
      averageTutorPayPercentage,
    });

    return res.status(200).json({
      feeStructures: feeStructureCount,
      packages: packageCount,
      averageTutorPayPercentage,
    });
  } catch (error) {
    logger.error("Error fetching fee summary", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Utility
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
  percent = Math.max(0, percent);

  return Number(percent.toFixed(2));
}

exports.getAllFeeStructuresNoPagination = async (req, res) => {
  try {
    const { subject, addedBy, search, classRange, sortBy = "updatedAt", sortOrder = "DESC" } = req.query;

    logger.info("Fetching all fee structures (no pagination)", {
      subject,
      addedBy,
      search,
      classRange,
      sortBy,
      sortOrder,
    });

    const whereClause = {
      isDeleted: false,
    };

    if (subject) whereClause.subjectId = subject;
    if (addedBy) whereClause.addedBy = addedBy;
    if (classRange) whereClause.classRangeId = classRange;

    if (search) {
      whereClause[Op.or] = [{ feePerHour: { [Op.like]: `%${search}%` } }];
    }

    /** ✅ Fetch all matching records */
    const feeStructures = await FeeStructure.findAll({
      where: whereClause,
      order: [[sortBy, sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]],
    });

    /** ✅ Lookup data */
    const [subjects, users, class_ranges] = await Promise.all([
      Subject.findAll({ attributes: ["id", "name"] }),
      User.findAll({ attributes: ["id", "firstName", "lastName"] }),
      ClassRange.findAll({ attributes: ["id", "label"] }),
    ]);

    const subjectMap = subjects.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    const userMap = users.reduce((acc, u) => {
      acc[u.id] = `${u.firstName}${u.lastName ? " " + u.lastName : ""}`;
      return acc;
    }, {});

    const classRangeMap = class_ranges.reduce((acc, r) => {
      acc[r.id] = r.label;
      return acc;
    }, {});

    const enrichedData = feeStructures.map((item) => ({
      ...item.toJSON(),
      subjectDisplay: subjectMap[item.subjectId] || "Unknown Subject",
      addedByDisplay: userMap[item.addedBy] || "Unknown User",
      classDisplay: classRangeMap[item.classRangeId] || "Unknown Class",
    }));

    logger.info(`Fee structures fetched: ${enrichedData.length}`);

    res.json({
      data: enrichedData,
      totalRecords: enrichedData.length,
    });
  } catch (err) {
    logger.error("Error fetching fee structures (no pagination)", err);
    res.status(500).json({ message: "Failed to fetch fee structures" });
  }
};
