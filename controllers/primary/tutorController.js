const Tutor = require("../../models/primary/Tutor");
const Subject = require("../../models/primary/Subject");
const Class = require("../../models/primary/ClassRange");
const Syllabus = require("../../models/primary/Syllabus");
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
      staffId: tutor.id,
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

    const { search } = req.query;

    const availableDay = req.query.availableDay || req.query["availableDay[]"];

    const shift = req.query.shift || req.query["shift[]"];

    const className = req.query.className || req.query["className[]"];

    const subject = req.query.subject || req.query["subject[]"];

    const syllabus = req.query.syllabus || req.query["syllabus[]"];

    const englishFluency = req.query.englishFluency;

    const allowedSortFields = [
      "fullName",
      "employeeId",
      "email",
      "joinDate",
      "status",
      "createdAt",
    ];

    const { page, limit, sortBy, sortOrder } = getPaginationParams(
      req,
      allowedSortFields,
      "createdAt",
    );

    const normalizeToArray = (value) => {
      if (!value) return [];

      if (Array.isArray(value)) {
        return value.map(String);
      }

      return String(value)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    };

    const availableDays = normalizeToArray(availableDay);
    const shifts = normalizeToArray(shift);
    const classNames = normalizeToArray(className);
    const subjects = normalizeToArray(subject);
    const syllabuses = normalizeToArray(syllabus);

    // =========================
    // BASE WHERE
    // =========================
    const tutorWhere = {
      isDeleted: false,
    };

    // =========================
    // SEARCH
    // =========================
    if (search) {
      tutorWhere[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { employeeId: { [Op.like]: `%${search}%` } },
      ];
    }

    // =========================
    // FETCH DATA
    // =========================
    const rows = await Tutor.findAll({
      where: tutorWhere,
      order: [[sortBy, sortOrder]],
    });

    // =========================
    // NORMALIZE DATA
    // =========================
    let tutors = rows.map((tutor) => {
      const data = tutor.toJSON();

      data.availableDays = safeParse(data.availableDays, []);
      data.availabilitySlots = safeParse(data.availabilitySlots, []);
      data.teachingDetails = safeParse(data.teachingDetails, []);
      data.languages = safeParse(data.languages, []);
      data.documents = safeParse(data.documents, []);
      data.bankDetails = safeParse(data.bankDetails, {});

      return data;
    });

    // =========================
    // FILTER: AVAILABLE DAYS
    // =========================
    if (availableDays.length) {
      tutors = tutors.filter((tutor) =>
        tutor.availableDays.some((day) => availableDays.includes(String(day))),
      );
    }

    // =========================
    // FILTER: SHIFTS
    // =========================
    if (shifts.length) {
      tutors = tutors.filter((tutor) =>
        tutor.availabilitySlots.some((slot) =>
          shifts.includes(String(slot.shift)),
        ),
      );
    }

    // =========================
    // FILTER: TEACHING DETAILS
    // =========================
    if (classNames.length || subjects.length || syllabuses.length) {
      tutors = tutors.filter((tutor) =>
        tutor.teachingDetails.some((detail) => {
          const classMatch = classNames.length
            ? classNames.includes(String(detail.className))
            : true;

          const subjectMatch = subjects.length
            ? subjects.includes(String(detail.subject))
            : true;

          const detailSyllabus = Array.isArray(detail.syllabus)
            ? detail.syllabus.map(String)
            : detail.syllabus
              ? [String(detail.syllabus)]
              : [];

          const syllabusMatch = syllabuses.length
            ? detailSyllabus.some((s) => syllabuses.includes(s))
            : true;

          return classMatch && subjectMatch && syllabusMatch;
        }),
      );
    }

    // =========================
    // FILTER: ENGLISH FLUENCY
    // =========================
    if (englishFluency) {
      tutors = tutors.filter((tutor) =>
        tutor.languages.some((lang) => {
          const language = lang.language || lang.name || lang.label;

          const fluency = lang.read || lang.level || lang.proficiency;

          return (
            String(language).toLowerCase() === "english" &&
            String(fluency).toLowerCase() ===
              String(englishFluency).toLowerCase()
          );
        }),
      );
    }

    // =========================
    // PAGINATION AFTER FILTER
    // =========================
    const total = tutors.length;

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedTutors = tutors.slice(startIndex, endIndex);

    // =========================
    // CREATED BY MAP
    // =========================
    const createdByIds = [
      ...new Set(paginatedTutors.map((t) => t.createdBy).filter(Boolean)),
    ];

    const creators = await User.findAll({
      where: {
        id: { [Op.in]: createdByIds },
        isDeleted: false,
      },
      attributes: ["id", "firstName", "lastName"],
    });

    const creatorMap = {};

    creators.forEach((creator) => {
      creatorMap[creator.id] =
        `${creator.firstName || ""} ${creator.lastName || ""}`.trim();
    });

    // =========================
    // RESPONSE
    // =========================
    const formattedTutors = paginatedTutors.map((tutor) => ({
      ...tutor,
      createdBy: creatorMap[tutor.createdBy] || null,
    }));

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

    // ======================================================
    // FETCH TUTOR
    // ======================================================

    const tutor = await Tutor.findOne({
      where: {
        id,
        isDeleted: false,
      },
    });

    // ======================================================
    // NOT FOUND
    // ======================================================

    if (!tutor) {
      logger.warn("Tutor not found", {
        tutorId: id,
      });

      return res.status(404).json({
        success: false,
        message: "Tutor not found",
      });
    }

    // ======================================================
    // CONVERT TO JSON
    // ======================================================

    const tutorData = tutor.toJSON();

    // ======================================================
    // NORMALIZE JSON FIELDS
    // ======================================================

    tutorData.languages = safeParse(tutorData.languages, []);

    tutorData.availableDays = safeParse(tutorData.availableDays, []);

    tutorData.availabilitySlots = safeParse(tutorData.availabilitySlots, []);

    tutorData.teachingDetails = safeParse(tutorData.teachingDetails, []);

    tutorData.documents = safeParse(tutorData.documents, []);

    tutorData.bankDetails = safeParse(tutorData.bankDetails, {
      upi: "",
      bank: "",
      ifsc: "",
      accountNo: "",
    });

    // ======================================================
    // FORMAT TEACHING DETAILS (OPTIONAL)
    // ======================================================

    // ======================================================
    // FORMAT TEACHING DETAILS
    // ======================================================

    if (
      Array.isArray(tutorData.teachingDetails) &&
      tutorData.teachingDetails.length > 0
    ) {
      const subjectIds = [
        ...new Set(
          tutorData.teachingDetails.map((item) => item.subject).filter(Boolean),
        ),
      ];

      const classIds = [
        ...new Set(
          tutorData.teachingDetails
            .map((item) => item.className)
            .filter(Boolean),
        ),
      ];

      const syllabusIds = [
        ...new Set(
          tutorData.teachingDetails.flatMap((item) =>
            Array.isArray(item.syllabus) ? item.syllabus : [],
          ),
        ),
      ];

      const [subjects, classes, syllabuses] = await Promise.all([
        Subject.findAll({
          where: {
            id: subjectIds,
          },
          attributes: ["id", "name"],
        }),

        Class.findAll({
          where: {
            id: classIds,
          },
          attributes: ["id", "label", "fromClass", "toClass"],
        }),

        Syllabus.findAll({
          where: {
            id: syllabusIds,
          },
          attributes: ["id", "name"],
        }),
      ]);

      const subjectMap = Object.fromEntries(
        subjects.map((item) => [String(item.id), item.name]),
      );

      const classMap = Object.fromEntries(
        classes.map((item) => [String(item.id), item.label]),
      );

      const syllabusMap = Object.fromEntries(
        syllabuses.map((item) => [String(item.id), item.name]),
      );

      tutorData.teachingDetails = tutorData.teachingDetails.map((item) => ({
        subject: subjectMap[String(item.subject)] || item.subject || "",

        syllabus: Array.isArray(item.syllabus)
          ? item.syllabus.map((id) => syllabusMap[String(id)] || id)
          : [],

        className: classMap[String(item.className)] || item.className || "",
      }));
    }

    // ======================================================
    // FORMAT AVAILABILITY SLOTS
    // ======================================================

    tutorData.availabilitySlots = tutorData.availabilitySlots.map((slot) => ({
      shift: slot.shift || "",
      fromTime: slot.fromTime || "",
      toTime: slot.toTime || "",
      timeRange:
        slot.fromTime && slot.toTime ? `${slot.fromTime} - ${slot.toTime}` : "",
    }));

    // ======================================================
    // GET CREATED BY USER
    // ======================================================

    if (tutorData.createdBy) {
      const creator = await User.findOne({
        where: {
          id: tutorData.createdBy,
          isDeleted: false,
        },
        attributes: ["id", "firstName", "lastName"],
      });

      tutorData.createdBy = creator
        ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim()
        : null;
    }

    // ======================================================
    // GET UPDATED BY USER
    // ======================================================

    if (tutorData.updatedBy) {
      const updater = await User.findOne({
        where: {
          id: tutorData.updatedBy,
          isDeleted: false,
        },
        attributes: ["id", "firstName", "lastName"],
      });

      tutorData.updatedBy = updater
        ? `${updater.firstName || ""} ${updater.lastName || ""}`.trim()
        : null;
    }

    // ======================================================
    // GET TUTOR DOCUMENTS
    // ======================================================

    const tutorDocuments = await TutorDocument.findAll({
      where: { tutorId: tutor.id },
      attributes: ["id", "fileName", "filePath", "fileType", "createdAt"],
      order: [["createdAt", "ASC"]],
    });

    tutorData.tutorDocuments = tutorDocuments.map((doc) => doc.toJSON());

    logger.info("Tutor fetched successfully", {
      tutorId: tutor.id,
    });

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(200).json({
      success: true,
      data: tutorData,
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

    // ============================================
    // PREPARE UPDATE DATA
    // ============================================

    const updateData = {
      ...req.body,
      updatedBy: req.user?.id || null,
    };

    // ============================================
    // PARSE JSON FIELDS
    // ============================================

    const jsonFields = [
      "bankDetails",
      "teachingDetails",
      "languages",
      "availableDays",
      "availabilitySlots",
      "documents",
    ];

    jsonFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        try {
          updateData[field] =
            typeof req.body[field] === "string"
              ? JSON.parse(req.body[field])
              : req.body[field];
        } catch (error) {
          logger.warn(`Invalid JSON format for ${field}`, {
            field,
            value: req.body[field],
          });
        }
      }
    });

    // ============================================
    // BOOLEAN FIELD CONVERSION
    // ============================================

    const booleanFields = [
      "hasLaptop",
      "hasWhiteBoard",
      "hasDigitalPen",
      "hasMobile",
    ];

    booleanFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] =
          req.body[field] === true ||
          req.body[field] === "true" ||
          req.body[field] === 1 ||
          req.body[field] === "1";
      }
    });

    if (req.files?.profilePhoto?.[0]) {
      updateData.profilePhoto = `/uploads/profile/${req.files.profilePhoto[0].filename}`;
    }

    // ============================================
    // UPDATE TUTOR
    // ============================================

    await tutor.update(updateData);

    logger.info("Tutor updated successfully", {
      tutorId: tutor.id,
    });

    // ============================================
    // FETCH UPDATED DATA
    // ============================================

    const updatedTutor = await Tutor.findByPk(tutor.id);

    return res.status(200).json({
      success: true,
      message: "Tutor updated successfully",
      data: updatedTutor,
    });
  } catch (error) {
    logger.error("UPDATE TUTOR ERROR", {
      message: error.message,
      stack: error.stack,
    });

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
const safeParse = (value, fallback = []) => {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }
  return value;
};
