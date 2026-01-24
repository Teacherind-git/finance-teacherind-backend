const { sequelizePrimary } = require("../../config/db");

const TutorPayroll = require("../../models/primary/TutorPayroll");
const TutorPayrollItem = require("../../models/primary/TutorPayrollItem");
const User = require("../../models/secondary/User");
const Class = require("../../models/primary/Class");
const Subject = require("../../models/primary/Subject");
const PayrollAudit = require("../../models/primary/PayrollAudit");
const logger = require("../../utils/logger"); // your logger instance
const { getPaginationParams } = require("../../utils/pagination");

/* =====================================================
   RESPONSE HELPERS
===================================================== */
const success = (res, message, data = null, status = 200) =>
  res.status(status).json({ success: true, message, data });

const failure = (res, message, status = 500) =>
  res.status(status).json({ success: false, message });

/* =====================================================
   CREATE / UPDATE (UPSERT STYLE)
===================================================== */
exports.saveTutorPayroll = async (req, res) => {
  const transaction = await sequelizePrimary.transaction();
  try {
    const { id } = req.params;
    const { tutorId, payrollMonth, items = [], remark } = req.body;

    let payroll;

    /* ---------- UPDATE ---------- */
    if (id) {
      payroll = await TutorPayroll.findOne({
        where: { id, isDeleted: false },
      });

      if (!payroll) {
        await transaction.rollback();
        return failure(res, "Payroll not found", 404);
      }

      await payroll.update(
        {
          remark,
          updatedBy: req.user?.id || 10,
        },
        { transaction },
      );

      // Soft delete existing items
      await TutorPayrollItem.update(
        { isDeleted: true },
        { where: { tutorPayrollId: payroll.id }, transaction },
      );
    } else {
      /* ---------- CREATE ---------- */
      payroll = await TutorPayroll.create(
        {
          tutorId,
          payrollMonth,
          remark,
          createdBy: req.user?.id || 10,
          updatedBy: req.user?.id || 10,
        },
        { transaction },
      );
    }

    /* ---------- INSERT ITEMS ---------- */
    const payrollItems = items.map((item) => ({
      tutorPayrollId: payroll.id,
      classId: item.classId,
      subjectId: item.subjectId,
      basePay: item.basePay,
      tutorId: tutorId,
    }));

    if (payrollItems.length) {
      await TutorPayrollItem.bulkCreate(payrollItems, { transaction });
    }

    await transaction.commit();

    const oldData = payroll.toJSON();
    const changedFields = Object.keys(req.body);
    await PayrollAudit.create({
      payrollId: payroll.id,
      staffId: tutorId,
      staffType: "TUTOR",
      action: "UPDATE",
      oldData,
      newData: payroll.toJSON(),
      changedFields,
      changedBy: req.user?.id,
    });

    return success(
      res,
      id
        ? "Tutor payroll updated successfully"
        : "Tutor payroll created successfully",
      { payrollId: payroll.id },
      id ? 200 : 201,
    );
  } catch (error) {
    await transaction.rollback();
    return failure(res, error.message);
  }
};

/* =====================================================
   GET ALL PAYROLLS
===================================================== */
exports.getTutorPayrolls = async (req, res) => {
  try {
    const allowedSortFields = ["createdAt", "updatedAt", "fullName"];

    const { page, limit, offset, sortBy, sortOrder } = getPaginationParams(
      req,
      allowedSortFields,
      "createdAt",
    );

    logger.info("Fetching tutor payrolls with pagination", {
      page,
      limit,
      sortBy,
      sortOrder,
    });

    /* ----------------------------------------------------
     * 1️⃣ Fetch paginated tutors (SECONDARY DB)
     * -------------------------------------------------- */
    const tutors = await User.findAll({
      where: { role: 3, status: 1 },
      attributes: ["id", "fullname"],
      limit,
      offset,
      raw: true,
    });

    // Early return if no tutors
    if (!tutors.length) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          totalRecords: 0,
          totalPages: 0,
        },
      });
    }

    const tutorIds = tutors.map((t) => t.id);

    /* ----------------------------------------------------
     * 2️⃣ Fetch payrolls + items + class + subject (PRIMARY DB)
     * -------------------------------------------------- */
    const payrolls = await TutorPayroll.findAll({
      where: {
        isDeleted: false,
        tutorId: tutorIds, // 🔥 IMPORTANT
      },
      include: [
        {
          model: TutorPayrollItem,
          as: "items",
          required: false,
          where: { isDeleted: false },
          attributes: ["id", "classId", "subjectId", "basePay"],
          include: [
            {
              model: Class,
              as: "class",
              attributes: ["id", "number"],
            },
            {
              model: Subject,
              as: "subject",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order:
        sortBy === "fullName"
          ? [["fullname", sortOrder]]
          : [["createdAt", sortOrder]],
    });

    /* ----------------------------------------------------
     * 3️⃣ Map payrolls by tutorId
     * -------------------------------------------------- */
    const payrollMap = {};
    payrolls.forEach((payroll) => {
      payrollMap[payroll.tutorId] = payroll;
    });

    /* ----------------------------------------------------
     * 4️⃣ Build final response
     * -------------------------------------------------- */
    const result = tutors.map((tutor) => {
      const payroll = payrollMap[tutor.id];

      return {
        id: payroll?.id ?? null,
        tutorId: tutor.id,
        fullName: tutor.fullname,

        baseSalary: payroll?.baseSalary ?? 0,
        grossSalary: payroll?.grossSalary ?? 0,
        totalEarnings: payroll?.totalEarnings ?? 0,
        totalDeductions: payroll?.totalDeductions ?? 0,
        netSalary: payroll?.netSalary ?? 0,

        payrollMonth: payroll?.payrollMonth ?? null,
        payrollExists: !!payroll,

        payrollItems: payroll
          ? payroll.items.map((item) => ({
              id: item.id,
              basePay: item.basePay,

              classId: item.classId,
              classNumber: item.class?.number ?? null,

              subjectId: item.subjectId,
              subjectName: item.subject?.name ?? null,
            }))
          : [],
      };
    });

    /* ----------------------------------------------------
     * 5️⃣ Total count for pagination
     * -------------------------------------------------- */
    const totalRecords = await User.count({
      where: { role: 3, status: 1 },
    });

    return res.json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (err) {
    logger.error("Failed to fetch tutor payroll list", {
      message: err.message,
      stack: err.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tutor payroll list",
    });
  }
};

/* =====================================================
   GET SINGLE PAYROLL
===================================================== */
exports.getTutorPayroll = async (req, res) => {
  try {
    const payroll = await TutorPayroll.findOne({
      where: { id: req.params.id, isDeleted: false },
      include: [
        {
          model: TutorPayrollItem,
          as: "items",
          where: { isDeleted: false },
          required: false,
          include: [
            { model: ClassRange, as: "class" },
            { model: Subject, as: "subject" },
          ],
        },
      ],
    });

    if (!payroll) {
      return failure(res, "Payroll not found", 404);
    }

    return success(res, "Tutor payroll details", payroll);
  } catch (error) {
    return failure(res, error.message);
  }
};

/* =====================================================
   DELETE (SOFT DELETE)
===================================================== */
exports.deleteTutorPayroll = async (req, res) => {
  const transaction = await sequelizePrimary.transaction();
  try {
    const payroll = await TutorPayroll.findOne({
      where: { id: req.params.id, isDeleted: false },
    });

    if (!payroll) {
      await transaction.rollback();
      return failure(res, "Payroll not found", 404);
    }

    await payroll.update(
      {
        isDeleted: true,
        updatedBy: req.user?.id || 10,
      },
      { transaction },
    );

    await TutorPayrollItem.update(
      { isDeleted: true },
      { where: { tutorPayrollId: payroll.id }, transaction },
    );

    await transaction.commit();

    return success(res, "Tutor payroll deleted successfully");
  } catch (error) {
    await transaction.rollback();
    return failure(res, error.message);
  }
};
