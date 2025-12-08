const Student = require("../../models/primary/Student");
const StudentDetail = require("../../models/primary/StudentDetail");
const Subject = require("../../models/primary/Subject");
const Package = require("../../models/primary/Package");
const ClassRange = require("../../models/primary/ClassRange");
const { sequelizePrimary } = require("../../config/db");
const logger = require("../../utils/logger");

/* ================= CREATE STUDENT ================= */
exports.createStudent = async (req, res) => {
  const t = await sequelizePrimary.transaction();
  try {
    const userId = req.user.id;
    const { name, contact, details } = req.body;

    logger.info("Creating student", {
      name,
      createdBy: userId,
      detailsCount: details?.length,
    });

    const student = await Student.create(
      { name, contact, createdBy: userId },
      { transaction: t }
    );

    const detailsToCreate = details.map((d) => ({
      ...d,
      studentId: student.id,
    }));

    await StudentDetail.bulkCreate(detailsToCreate, { transaction: t });

    await t.commit();

    const created = await Student.findByPk(student.id, {
      include: { model: StudentDetail, as: "details" },
    });

    logger.info("Student created successfully", {
      studentId: student.id,
    });

    res.status(201).json({ success: true, student: created });
  } catch (error) {
    await t.rollback();
    logger.error("Error creating student", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create student" });
  }
};

/* ================= GET ALL STUDENTS ================= */
exports.getAllStudents = async (req, res) => {
  try {
    logger.info("Fetching all students");

    const students = await Student.findAll({
      include: [
        {
          model: StudentDetail,
          as: "details",
          include: [
            {
              model: ClassRange,
              as: "class_range",
              attributes: ["id", "label"],
            },
            {
              model: Subject,
              as: "subject",
              attributes: ["id", "name"],
            },
            {
              model: Package,
              as: "package",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      where: { isDeleted: false },
    });

    logger.info(`Students fetched: ${students.length}`);

    res.status(200).json({ success: true, students });
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

    const student = await Student.findByPk(id, {
      include: { model: StudentDetail, as: "details" },
    });

    if (!student) {
      logger.warn(`Student not found: ${id}`);
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    res.status(200).json({ success: true, student });
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
    const { name, contact, details } = req.body;

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
      { name, contact, updatedBy: userId },
      { transaction: t }
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
      { transaction: t }
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
