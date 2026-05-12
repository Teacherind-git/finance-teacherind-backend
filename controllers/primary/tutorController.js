const Tutor = require("../../models/primary/Tutor");
const User = require("../../models/primary/User");
const TutorDocument = require("../../models/primary/TutorDocument");
const logger = require("../../utils/logger");
const { getPaginationParams } = require("../../utils/pagination");
const { Op } = require("sequelize");
const axios = require("axios");

// ======================================================
// CREATE TUTOR
// ======================================================

exports.createTutor = async (req, res) => {
  try {
    logger.info("Creating tutor", {
      body: req.body,
      userId: req.user?.id,
    });

    const data = {
      ...req.body,
      createdBy: req.user?.id || null,
    };

    // ✅ Profile photo upload
    if (req.files?.profilePhoto) {
      data.profilePhoto = `/uploads/profile/${req.files.profilePhoto[0].filename}`;
    }

    // ======================================================
    // 1. CREATE IN PRIMARY DB FIRST
    // ======================================================
    const tutor = await Tutor.create(data);

    logger.info("Tutor created in primary DB", {
      tutorId: tutor.id,
    });

    // ======================================================
    // 2. SEND RESPONSE TO CLIENT
    // ======================================================
    res.status(201).json({
      success: true,
      message: "Tutor created successfully",
      data: tutor,
    });

    // ======================================================
    // 3. AFTER PRIMARY SUCCESS → CALL SECONDARY API
    // ======================================================
    try {
      const payload = {
        email: tutor.email,
        fullname: tutor.fullName,
        phone: tutor.phone,
        password: tutor.password || "secret123",

        counsellor_id: req.user?.id || 0,

        qualification: tutor.qualification || "",
        age: tutor.age ? String(tutor.age) : "",
        location: tutor.state || tutor.location || "",
        alternatecontact: tutor.alternatePhone || "",

        classes:
          tutor.teachingDetails?.map((item, index) => {
            return `${index + 1}|${item.className}`;
          }) || [],

        subjects:
          tutor.teachingDetails?.map((item, index) => {
            return `${index + 1}|${item.subject}`;
          }) || [],
      };

      const secondaryResponse = await axios.post(
        "https://ai.teacherind.com/api/add-tutor",
        payload,
      );

      logger.info("Tutor added to secondary DB", {
        tutorId: tutor.id,
        response: secondaryResponse.data,
      });
    } catch (secondaryError) {
      logger.error(
        "SECONDARY DB TUTOR CREATE ERROR",
        secondaryError?.response?.data || secondaryError.message,
      );
    }
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

    // ======================================================
    // QUERY PARAMS
    // ======================================================

    const {
      search,
      availableDay,
      shift,
      className,
      subject,
      syllabus,
    } = req.query;

    // ======================================================
    // ALLOWED SORT FIELDS
    // ======================================================

    const allowedSortFields = [
      "fullName",
      "employeeId",
      "email",
      "joinDate",
      "status",
      "createdAt",
    ];

    // ======================================================
    // PAGINATION PARAMS
    // ======================================================

    const { page, limit, sortBy, sortOrder } = getPaginationParams(
      req,
      allowedSortFields,
      "createdAt",
    );

    // ======================================================
    // WHERE CONDITION
    // ======================================================

    const tutorWhere = {
      isDeleted: false,
    };

    // ======================================================
    // SEARCH
    // ======================================================

    if (search) {
      tutorWhere[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { employeeId: { [Op.like]: `%${search}%` } },
      ];
    }

    // ======================================================
    // FETCH ALL MATCHING TUTORS
    // ======================================================

    let tutors = await Tutor.findAll({
      where: tutorWhere,

      order: [[sortBy, sortOrder]],
    });

    // ======================================================
    // FILTER: AVAILABLE DAY
    // ======================================================

    if (availableDay) {
      tutors = tutors.filter((tutor) =>
        (tutor.availableDays || []).includes(availableDay),
      );
    }

    // ======================================================
    // FILTER: SHIFT
    // ======================================================

    if (shift) {
      tutors = tutors.filter((tutor) =>
        (tutor.availabilitySlots || []).some(
          (slot) => slot.shift === shift,
        ),
      );
    }

    // ======================================================
    // FILTER: TEACHING DETAILS
    // ======================================================

    if (className || subject || syllabus) {
      tutors = tutors.filter((tutor) =>
        (tutor.teachingDetails || []).some((detail) => {
          const classMatch = className
            ? String(detail.className) === String(className)
            : true;

          const subjectMatch = subject
            ? String(detail.subject) === String(subject)
            : true;

          const syllabusMatch = syllabus
            ? String(detail.syllabus) === String(syllabus)
            : true;

          return classMatch && subjectMatch && syllabusMatch;
        }),
      );
    }

    // ======================================================
    // TOTAL COUNT AFTER FILTERING
    // ======================================================

    const total = tutors.length;

    // ======================================================
    // PAGINATION
    // ======================================================

    const startIndex = (page - 1) * limit;

    const endIndex = startIndex + limit;

    tutors = tutors.slice(startIndex, endIndex);

    // ======================================================
    // GET CREATED BY USERS
    // ======================================================

    const createdByIds = tutors
      .map((tutor) => tutor.createdBy)
      .filter(Boolean);

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
      creatorMap[creator.id] = `${creator.firstName || ""} ${
        creator.lastName || ""
      }`.trim();
    });

    // ======================================================
    // FORMAT RESPONSE
    // ======================================================

    const formattedTutors = tutors.map((tutor) => ({
      ...tutor.toJSON(),

      createdBy: creatorMap[tutor.createdBy] || null,
    }));

    logger.info("Tutors fetched", {
      count: formattedTutors.length,
      page,
    });

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(200).json({
      success: true,

      data: formattedTutors,

      pagination: {
        total,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        sortBy,
        sortOrder,
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
exports.uploadDocuments = async (req, res) => {
  try {
    if (!req.files?.documents?.length) {
      logger.warn("No documents uploaded");
      return res.status(400).json({ message: "No documents uploaded" });
    }

    const tutor = await Tutor.findByPk(req.params.id);
    if (!tutor) {
      logger.warn(`Tutor not found for document upload: ${req.params.id}`);
      return res.status(404).json({ message: "Not found" });
    }

    await TutorDocument.bulkCreate(
      req.files.documents.map((file) => ({
        tutorId: tutor.id,
        fileName: file.originalname,
        filePath: `/uploads/documents/${file.filename}`,
        fileType: file.mimetype,
      })),
    );

    logger.info("Tutor documents uploaded", {
      tutorId: tutor.id,
      count: req.files.documents.length,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error uploading staff documents", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
