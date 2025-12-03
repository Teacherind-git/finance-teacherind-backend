const Student = require("../../models/primary/Student");
const StudentDetail = require("../../models/primary/StudentDetail");
const { sequelizePrimary } = require("../../config/db");

// CREATE STUDENT WITH DETAILS
exports.createStudent = async (req, res) => {
  const t = await sequelizePrimary.transaction();
  try {
    const userId = req.user.id;
    const { name, contact, details } = req.body;

    // 1️⃣ create student
    const student = await Student.create(
      { name, contact, createdBy: userId, updatedBy: userId },
      { transaction: t }
    );

    // 2️⃣ create student details
    const detailsToCreate = details.map((d) => ({
      ...d,
      studentId: student.id,
    }));

    await StudentDetail.bulkCreate(detailsToCreate, { transaction: t });

    await t.commit();

    // Fetch full student with details
    const created = await Student.findByPk(student.id, {
      include: { model: StudentDetail, as: "details" },
    });

    res.status(201).json({ success: true, student: created });
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create student" });
  }
};

// GET ALL STUDENTS WITH DETAILS
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: { model: StudentDetail, as: "details" },
    });
    res.status(200).json({ success: true, students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch students" });
  }
};

// GET SINGLE STUDENT
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id, {
      include: { model: StudentDetail, as: "details" },
    });
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    res.status(200).json({ success: true, student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch student" });
  }
};

// UPDATE STUDENT + DETAILS
exports.updateStudent = async (req, res) => {
  const t = await sequelizePrimary.transaction();
  try {
    const userId = req.user.id;
    const { name, contact, details } = req.body;

    const student = await Student.findByPk(req.params.id);
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    await student.update({ name, contact, updatedBy: userId }, { transaction: t });

    // Remove old details and insert new ones
    await StudentDetail.destroy({ where: { studentId: student.id }, transaction: t });
    const detailsToCreate = details.map((d) => ({ ...d, studentId: student.id }));
    await StudentDetail.bulkCreate(detailsToCreate, { transaction: t });

    await t.commit();

    const updatedStudent = await Student.findByPk(student.id, {
      include: { model: StudentDetail, as: "details" },
    });

    res.status(200).json({ success: true, student: updatedStudent });
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update student" });
  }
};

// DELETE STUDENT + DETAILS
exports.deleteStudent = async (req, res) => {
  const t = await sequelizePrimary.transaction();
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    await StudentDetail.destroy({ where: { studentId: student.id }, transaction: t });
    await student.destroy({ transaction: t });

    await t.commit();
    res.status(200).json({ success: true, message: "Student deleted" });
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete student" });
  }
};
