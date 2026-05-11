const Tutor = require("../../models/primary/Tutor");
const User = require("../../models/primary/User");
const logger = require("../../utils/logger");
const { getPaginationParams } = require("../../utils/pagination");
const { Op } = require("sequelize");


// ======================================================
// CREATE TUTOR
// ======================================================

exports.createTutor = async (req, res) => {
  try {
    logger.info("Creating tutor", {
      body: req.body,
      userId: req.user?.id,
    });

    // ✅ Profile photo upload
    if (req.files?.profilePhoto) {
      data.profilePhoto = `/uploads/profile/${req.files.profilePhoto[0].filename}`;
    }

    const tutor = await Tutor.create({
      ...req.body,
      createdBy: req.user?.id || null,
    });

    logger.info("Tutor created successfully", {
      tutorId: tutor.id,
    });

    return res.status(201).json({
      success: true,
      message: "Tutor created successfully",
      data: tutor,
    });
  } catch (error) {
    logger.error("CREATE TUTOR ERROR", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create tutor",
    });
  }
};

// ======================================================
// GET ALL TUTORS
// ======================================================

exports.getTutors = async (req, res) => {
  try {
    logger.info("Fetching tutors");

    // ✅ allowed sorting fields
    const allowedSortFields = [
      "fullName",
      "employeeId",
      "email",
      "joinDate",
      "status",
      "createdAt",
    ];

    // ✅ pagination params
    const { page, limit, offset, sortBy, sortOrder } = getPaginationParams(
      req,
      allowedSortFields,
      "createdAt",
    );

    // ======================================================
    // FETCH TUTORS
    // ======================================================

    const { rows: tutors, count: total } = await Tutor.findAndCountAll({
      where: {
        isDeleted: false,
      },

      order: [[sortBy, sortOrder]],
      limit,
      offset,
    });

    // ======================================================
    // GET CREATED BY USERS
    // ======================================================

    const createdByIds = tutors.map((tutor) => tutor.createdBy).filter(Boolean);

    const creators = await User.findAll({
      where: {
        id: {
          [Op.in]: createdByIds,
        },
        isDeleted: false,
      },

      attributes: ["id", "firstName", "lastName"],
    });

    // ======================================================
    // CREATE MAP
    // ======================================================

    const creatorMap = {};

    creators.forEach((creator) => {
      creatorMap[creator.id] =
        `${creator.firstName || ""} ${creator.lastName || ""}`.trim();
    });

    // ======================================================
    // ADD creatorName TO RESPONSE
    // ======================================================

    const formattedTutors = tutors.map((tutor) => ({
      ...tutor.toJSON(),

      createdBy: creatorMap[tutor.createdBy] || null,
    }));

    logger.info("Tutors fetched", {
      count: tutors.length,
      page,
    });

    return res.status(200).json({
      success: true,

      data: formattedTutors,

      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("GET TUTORS ERROR", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tutors",
    });
  }
};

// ======================================================
// GET SINGLE TUTOR
// ======================================================

exports.getTutorById = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Fetching tutor by ID", {
      tutorId: id,
    });

    const tutor = await Tutor.findOne({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!tutor) {
      logger.warn("Tutor not found", {
        tutorId: id,
      });

      return res.status(404).json({
        success: false,
        message: "Tutor not found",
      });
    }

    logger.info("Tutor fetched", {
      tutorId: tutor.id,
    });

    return res.status(200).json({
      success: true,
      data: tutor,
    });
  } catch (error) {
    logger.error("GET TUTOR ERROR", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tutor",
    });
  }
};

// ======================================================
// UPDATE TUTOR
// ======================================================

exports.updateTutor = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Updating tutor", {
      tutorId: id,
      userId: req.user?.id,
      body: req.body,
    });

    const tutor = await Tutor.findOne({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!tutor) {
      logger.warn("Tutor not found for update", {
        tutorId: id,
      });

      return res.status(404).json({
        success: false,
        message: "Tutor not found",
      });
    }

    await tutor.update({
      ...req.body,
      updatedBy: req.user?.id || null,
    });

    logger.info("Tutor updated successfully", {
      tutorId: tutor.id,
    });

    return res.status(200).json({
      success: true,
      message: "Tutor updated successfully",
      data: tutor,
    });
  } catch (error) {
    logger.error("UPDATE TUTOR ERROR", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update tutor",
    });
  }
};

// ======================================================
// DELETE TUTOR (SOFT DELETE)
// ======================================================

exports.deleteTutor = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Deleting tutor", {
      tutorId: id,
      userId: req.user?.id,
    });

    const tutor = await Tutor.findOne({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!tutor) {
      logger.warn("Tutor not found for delete", {
        tutorId: id,
      });

      return res.status(404).json({
        success: false,
        message: "Tutor not found",
      });
    }

    await tutor.update({
      isDeleted: true,
      updatedBy: req.user?.id || null,
    });

    logger.info("Tutor deleted successfully", {
      tutorId: tutor.id,
    });

    return res.status(200).json({
      success: true,
      message: "Tutor deleted successfully",
    });
  } catch (error) {
    logger.error("DELETE TUTOR ERROR", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete tutor",
    });
  }
};
