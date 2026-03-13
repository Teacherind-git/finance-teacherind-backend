const { sequelizePrimary } = require("../../config/db");

const TutorPayroll = require("../../models/primary/TutorPayroll");
const TutorPayrollItem = require("../../models/primary/TutorPayrollItem");
const User = require("../../models/secondary/User");
const Class = require("../../models/primary/Class");
const Syllabus = require("../../models/primary/Syllabus");
const PayrollAudit = require("../../models/primary/PayrollAudit");
const TutorSalary = require("../../models/primary/TutorSalary");
const logger = require("../../utils/logger"); // your logger instance
const { getPaginationParams } = require("../../utils/pagination");
const { Op } = require("sequelize");

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
  const requestId = req.id || Date.now();

  try {
    logger.info("📥 saveTutorPayroll started", {
      requestId,
      params: req.params,
      body: req.body,
      userId: req.user?.id,
    });

    const { id } = req.params;
    const { tutorId, payrollMonth, items = [], remark } = req.body;

    let payroll;
    let action = "CREATE";
    let oldData = null;

    /* ---------- UPDATE ---------- */
    if (id) {
      action = "UPDATE";

      payroll = await TutorPayroll.findOne({
        where: { id, isDeleted: false },
        transaction,
      });

      if (!payroll) {
        logger.warn("Tutor payroll not found for update", {
          requestId,
          payrollId: id,
        });

        await transaction.rollback();
        return failure(res, "Payroll not found", 404);
      }

      oldData = payroll.toJSON();

      await payroll.update(
        {
          remark,
          updatedBy: req.user?.id || 10,
        },
        { transaction },
      );

      logger.info("Tutor payroll header updated", {
        requestId,
        payrollId: payroll.id,
      });

      // Soft delete existing items
      await TutorPayrollItem.update(
        { isDeleted: true },
        {
          where: { tutorPayrollId: payroll.id },
          transaction,
        },
      );

      logger.debug("Old payroll items soft deleted", {
        requestId,
        payrollId: payroll.id,
      });
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

      logger.info("Tutor payroll created", {
        requestId,
        payrollId: payroll.id,
        tutorId,
        payrollMonth,
      });
    }

    /* ---------- INSERT ITEMS ---------- */
    const payrollItems = items.map((item, index) => {
      if (!item.classId || !item.syllabusId || !item.board || !item.slab) {
        logger.warn("Invalid payroll item detected", {
          requestId,
          index,
          item,
        });

        throw new Error("Invalid payroll item data");
      }

      return {
        tutorPayrollId: payroll.id,
        tutorId,
        classId: item.classId,
        syllabusId: item.syllabusId,
        board: item.board,
        slab: item.slab,
        basePay: item.basePay,
      };
    });

    if (payrollItems.length) {
      await TutorPayrollItem.bulkCreate(payrollItems, { transaction });

      logger.info("Tutor payroll items inserted", {
        requestId,
        payrollId: payroll.id,
        itemCount: payrollItems.length,
      });
    }

    await transaction.commit();

    logger.info("✅ saveTutorPayroll committed successfully", {
      requestId,
      payrollId: payroll.id,
      action,
    });

    /* ---------- AUDIT ---------- */
    await PayrollAudit.create({
      payrollId: payroll.id,
      staffId: tutorId,
      staffType: "TUTOR",
      action,
      oldData,
      newData: payroll.toJSON(),
      changedFields: Object.keys(req.body),
      changedBy: req.user?.id,
    });

    logger.info("Payroll audit log created", {
      requestId,
      payrollId: payroll.id,
      action,
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

    logger.error("❌ saveTutorPayroll failed", {
      requestId,
      message: error.message,
      stack: error.stack,
    });

    return failure(res, error.message);
  }
};

/* =====================================================
   GET ALL PAYROLLS
===================================================== */
exports.getTutorPayrolls = async (req, res) => {
  const requestId = req.id || Date.now();

  try {
    logger.info("📥 getTutorPayrolls request started", {
      requestId,
      query: req.query,
    });

    const { search } = req.query;

    const { page, limit, offset, sortOrder } = getPaginationParams(
      req,
      ["createdAt"],
      "createdAt",
    );

    logger.debug("Pagination params resolved", {
      requestId,
      page,
      limit,
      offset,
      sortOrder,
    });

    /* ----------------------------------------------------
     * Build tutor filter (SEARCH SUPPORT)
     * -------------------------------------------------- */
    const tutorWhere = {
      role: 3,
      status: 1,
    };

    if (search) {
      tutorWhere[Op.or] = [
        {
          fullname: {
            [Op.like]: `%${search}%`,
          },
        },
      ];
    }

    /* ----------------------------------------------------
     * 1️⃣ Fetch tutors (SECONDARY DB)
     * -------------------------------------------------- */
    const tutors = await User.findAll({
      where: tutorWhere,
      attributes: ["id", "fullname"],
      limit,
      offset,
      raw: true,
    });

    logger.info("Tutors fetched", {
      requestId,
      tutorCount: tutors.length,
    });

    if (!tutors.length) {
      logger.warn("No tutors found for payroll listing", {
        requestId,
        page,
        limit,
      });

      return res.json({
        success: true,
        data: [],
        pagination: { page, limit, totalRecords: 0, totalPages: 0 },
      });
    }

    const tutorIds = tutors.map((t) => t.id);

    logger.debug("Tutor IDs resolved", {
      requestId,
      tutorIds,
    });

    /* ----------------------------------------------------
     * 2️⃣ Fetch payrolls + items (PRIMARY DB)
     * -------------------------------------------------- */
    const payrolls = await TutorPayroll.findAll({
      where: {
        tutorId: tutorIds,
        isDeleted: false,
      },
      include: [
        {
          model: TutorPayrollItem,
          as: "items",
          where: { isDeleted: false },
          required: false,
          attributes: [
            "id",
            "classId",
            "syllabusId",
            "board",
            "slab",
            "basePay",
          ],
          include: [
            {
              model: Class,
              as: "class",
              attributes: ["id", "number"],
            },
            {
              model: Syllabus,
              as: "syllabus",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["createdAt", sortOrder]],
    });

    logger.info("Payrolls fetched", {
      requestId,
      payrollCount: payrolls.length,
    });

    /* ----------------------------------------------------
     * 3️⃣ Map payrolls
     * -------------------------------------------------- */
    const payrollMap = {};
    payrolls.forEach((p) => {
      payrollMap[p.tutorId] = p;
    });

    logger.debug("Payroll map created", {
      requestId,
      mappedTutorCount: Object.keys(payrollMap).length,
    });

    /* ----------------------------------------------------
     * 4️⃣ Build response
     * -------------------------------------------------- */
    const result = tutors.map((tutor) => {
      const payroll = payrollMap[tutor.id];

      if (!payroll) {
        logger.warn("Payroll missing for tutor", {
          requestId,
          tutorId: tutor.id,
        });
      }

      return {
        id: payroll?.id ?? null,
        tutorId: tutor.id,
        fullName: tutor.fullname,
        grossSalary: payroll?.grossSalary ?? 0,
        netSalary: payroll?.netSalary ?? 0,
        payrollMonth: payroll?.payrollMonth ?? null,
        payrollExists: !!payroll,

        payrollItems: payroll
          ? payroll.items.map((item) => ({
              id: item.id,
              classId: item.classId,
              classNumber: item.class?.number ?? null,
              syllabusId: item.syllabusId,
              syllabusName: item.syllabus?.name ?? null,
              board: item.board,
              slab: item.slab,
              basePay: item.basePay,
            }))
          : [],
      };
    });

    /* ----------------------------------------------------
     * 5️⃣ Pagination count
     * -------------------------------------------------- */
    const totalRecords = await User.count({
      where: tutorWhere,
    });

    logger.info("📤 getTutorPayrolls completed successfully", {
      requestId,
      returnedRecords: result.length,
      totalRecords,
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
    logger.error("❌ Failed to fetch tutor payroll list", {
      requestId,
      message: err.message,
      sqlMessage: err?.parent?.sqlMessage,
      sql: err?.parent?.sql,
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
  const requestId = req.id || Date.now();

  try {
    logger.info("📥 getTutorPayroll started", {
      requestId,
      payrollId: req.params.id,
      userId: req.user?.id,
    });

    const payroll = await TutorPayroll.findOne({
      where: {
        id: req.params.id,
        isDeleted: false,
      },
      include: [
        {
          model: TutorPayrollItem,
          as: "items",
          where: { isDeleted: false },
          required: false,
          attributes: [
            "id",
            "classId",
            "syllabusId",
            "board",
            "slab",
            "basePay",
          ],
          include: [
            {
              model: Class,
              as: "class",
              attributes: ["id", "number"],
            },
            {
              model: Syllabus,
              as: "syllabus",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });

    if (!payroll) {
      logger.warn("Tutor payroll not found", {
        requestId,
        payrollId: req.params.id,
      });

      return failure(res, "Payroll not found", 404);
    }

    logger.info("Tutor payroll fetched successfully", {
      requestId,
      payrollId: payroll.id,
      tutorId: payroll.tutorId,
      itemCount: payroll.items?.length || 0,
    });

    return success(res, "Tutor payroll details", payroll);
  } catch (error) {
    logger.error("❌ getTutorPayroll failed", {
      requestId,
      payrollId: req.params.id,
      message: error.message,
      stack: error.stack,
    });

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

exports.updateTutorPayroll = async (req, res) => {
  const transaction = await sequelizePrimary.transaction();

  try {
    const { id } = req.params;

    const {
      payrollMonth,
      tutorId,
      earnings,
      deductions,
      totalEarnings,
      totalDeductions,
      grossSalary,
      netSalary,
      remark,
      baseSalary,
    } = req.body;

    logger.info("Updating tutor payroll", { id });

    const payroll = await TutorPayroll.findOne({
      where: { id, isDeleted: false },
      transaction,
    });

    if (!payroll) {
      await transaction.rollback();
      return res.status(404).json({ message: "Payroll not found" });
    }

    /* =============================
       UPDATE PAYROLL
    ============================== */

    await payroll.update(
      {
        payrollMonth,
        tutorId,
        earnings,
        deductions,
        totalEarnings,
        totalDeductions,
        grossSalary,
        netSalary,
        remark,
        updatedBy: req.user?.id || null,
      },
      { transaction },
    );

    /* =============================
       UPDATE SALARY ENTRY
    ============================== */

    const salary = await TutorSalary.findOne({
      where: {
        payrollId: id,
        isDeleted: false,
      },
      transaction,
    });

    if (salary) {
      await salary.update(
        {
          amount: netSalary,
          payrollMonth,
          updatedBy: req.user?.id || null,
        },
        { transaction },
      );
    }

    await transaction.commit();

    logger.info("Tutor payroll updated successfully", { id });

    return res.status(200).json({
      message: "Tutor payroll updated successfully",
      payroll,
    });
  } catch (error) {
    await sequelizePrimary.transaction.rollback();

    logger.error("Error updating tutor payroll", error);

    return res.status(500).json({
      message: "Failed to update tutor payroll",
      error: error.message,
    });
  }
};
