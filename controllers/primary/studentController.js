const Student = require("../../models/primary/Student");
const StudentDetail = require("../../models/primary/StudentDetail");
const SecondaryUser = require("../../models/secondary/User");
const { sequelizePrimary } = require("../../config/db");
const logger = require("../../utils/logger");
const axios = require("axios");
const { getPaginationParams } = require("../../utils/pagination");
const { Op } = require("sequelize");
const {
  getActivePackages,
  buildBreakdown,
} = require("../../utils/secondaryBilling");

/* ================= CREATE STUDENT ================= */
exports.createStudent = async (req, res) => {
  const t = await sequelizePrimary.transaction();
  try {
    const userId = req.user.id;
    const { name, contact, alternateContact, source, details } = req.body;

    logger.info("Creating student", {
      name,
      createdBy: userId,
      detailsCount: details?.length,
    });

    // -----------------------------
    // 1. Create student
    // -----------------------------
    const student = await Student.create(
      {
        name,
        contact,
        alternateContact,
        source,
        createdBy: userId,
        updatedBy: userId,
      },
      { transaction: t },
    );

    const detailsToCreate = details.map((d) => ({
      ...d,
      studentId: student.id,
    }));

    await StudentDetail.bulkCreate(detailsToCreate, { transaction: t });

    // -----------------------------
    // 2. Commit DB changes
    // -----------------------------
    await t.commit();

    // -----------------------------
    // 3. Fetch final student with details
    // -----------------------------
    const created = await Student.findByPk(student.id, {
      include: { model: StudentDetail, as: "details" },
    });

    // -----------------------------
    // 4. Call external API
    // -----------------------------
    try {
      const payload = {
        email: contact, // Or student.email
        fullname: name,
        phone: contact,
      };

      const externalResponse = await axios.post(
        "https://ai.teacherind.com/api/add-student",
        payload,
      );

      logger.info("External student created", {
        studentId: student.id,
        apiResponse: externalResponse.data,
      });
    } catch (apiError) {
      logger.error("External API student creation failed", {
        studentId: student.id,
        error: apiError.response?.data || apiError.message,
      });
      // ⚠ Do NOT fail main response — student saved already
    }

    // -----------------------------
    // 5. Send final response
    // -----------------------------
    res.status(201).json({
      success: true,
      student: created,
      externalApiStatus: "Triggered",
    });
  } catch (error) {
    await t.rollback();
    logger.error("Error creating student", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create student" });
  }
};

/* ================= GET ALL STUDENTS (secondary DB, role = 4) ================= */
exports.getAllStudents = async (req, res) => {
  try {
    logger.info("Fetching all students");

    const { search } = req.query;

    const { page, limit, offset, sortBy, sortOrder } = getPaginationParams(
      req,
      ["id", "fullname", "email", "status"],
      "id",
    );

    let whereCondition = { role: 4 };

    if (search) {
      whereCondition[Op.or] = [
        { fullname: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await SecondaryUser.findAndCountAll({
      where: whereCondition,
      attributes: ["id", "fullname", "email", "phone", "status"],
      limit,
      offset,
      order: [[sortBy, sortOrder]],
      raw: true,
    });

    const formattedStudents = rows.map((student) => ({
      id: student.id,
      fullName: student.fullname,
      email: student.email,
      phone: student.phone,
      status: student.status === 1 ? "Active" : "Inactive",
    }));

    res.status(200).json({
      success: true,
      data: formattedStudents,
      pagination: {
        totalRecords: count,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    logger.error("Error fetching students", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
    });
  }
};

/* ================= GET SINGLE STUDENT ================= */
exports.getStudent = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Fetching student by ID: ${id}`);

    const student = await SecondaryUser.findOne({
      where: { id, role: 4 },
      attributes: ["id", "fullname", "email", "phone", "status"],
      raw: true,
    });

    if (!student) {
      logger.warn(`Student not found: ${id}`);
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    let subjectDetails = null;
    try {
      const { data } = await axios.post(
        "https://ai.teacherind.com/api/student-subject-details",
        { student_id: id },
      );
      subjectDetails = data;
    } catch (apiError) {
      logger.error("Failed to fetch student subject details", {
        studentId: id,
        error: apiError.response?.data || apiError.message,
      });
    }

    let billing = null;
    const subjects = subjectDetails?.data?.subjects;
    if (subjects?.length) {
      const packages = await getActivePackages();
      if (packages.length) {
        const {
          breakdown,
          totalClasses,
          examFee,
          totalAmount,
          perClassRate,
          primaryPackage,
        } = buildBreakdown(subjects, packages);
        billing = {
          packageId: primaryPackage?.id || null,
          packageName: primaryPackage?.name || null,
          perClassRate,
          totalClasses,
          examFee,
          totalAmount,
          breakdown,
        };
      }
    }

    res.status(200).json({
      success: true,
      student: {
        id: student.id,
        fullName: student.fullname,
        email: student.email,
        phone: student.phone,
        status: student.status === 1 ? "Active" : "Inactive",
        subjectDetails,
        billing,
      },
    });
  } catch (error) {
    logger.error("Error fetching student", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch student" });
  }
};

/* ================= UPDATE STUDENT ================= */
exports.updateStudent = async (req, res) => {
  const t = await sequelizePrimary.transaction();
  try {
    const userId = req.user.id;
    const { name, contact, alternateContact, source, status, details } =
      req.body;

    logger.info("Updating student", {
      studentId: req.params.id,
      updatedBy: userId,
    });

    const student = await Student.findByPk(req.params.id);
    if (!student) {
      logger.warn(`Student not found for update: ${req.params.id}`);
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    await student.update(
      { name, contact, alternateContact, source, status, updatedBy: userId },
      { transaction: t },
    );

    await StudentDetail.destroy({
      where: { studentId: student.id },
      transaction: t,
    });

    const detailsToCreate = details.map((d) => ({
      ...d,
      studentId: student.id,
    }));

    await StudentDetail.bulkCreate(detailsToCreate, { transaction: t });

    await t.commit();

    const updatedStudent = await Student.findByPk(student.id, {
      include: { model: StudentDetail, as: "details" },
    });

    logger.info("Student updated successfully", {
      studentId: student.id,
    });

    res.status(200).json({ success: true, student: updatedStudent });
  } catch (error) {
    await t.rollback();
    logger.error("Error updating student", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update student" });
  }
};

/* ================= DELETE STUDENT ================= */
exports.deleteStudent = async (req, res) => {
  const t = await sequelizePrimary.transaction();
  try {
    logger.info("Soft deleting student", {
      studentId: req.params.id,
    });

    const student = await Student.findOne({
      where: { id: req.params.id, isDeleted: false },
      transaction: t,
    });

    if (!student) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    await student.update(
      {
        isDeleted: true,
        status: "Inactive", // ✅ optional
        updatedBy: req.user?.id || null,
      },
      { transaction: t },
    );

    await t.commit();

    logger.info("Student soft deleted successfully", {
      studentId: student.id,
    });

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    logger.error("Error soft deleting student", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete student" });
  }
};
/* ================= STUDENT SUMMARY (secondary DB, role = 4) ================= */
exports.getStudentSummary = async (req, res) => {
  try {
    logger.info("Fetching student summary");

    const [totalStudents, activeStudents, inactiveStudents] =
      await Promise.all([
        SecondaryUser.count({ where: { role: 4 } }),
        SecondaryUser.count({ where: { role: 4, status: 1 } }),
        SecondaryUser.count({ where: { role: 4, status: { [Op.ne]: 1 } } }),
      ]);

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        inactiveStudents,
      },
    });
  } catch (error) {
    logger.error("Error fetching student summary", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student summary",
    });
  }
};
