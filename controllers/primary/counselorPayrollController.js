const User = require("../../models/secondary/User");
const counselorPayroll = require("../../models/primary/CounselorPayroll");
const PayrollAudit = require("../../models/primary/PayrollAudit");
const logger = require("../../utils/logger");
const { getPaginationParams } = require("../../utils/pagination");
const { Op } = require("sequelize");

/**
 * GET counselor payroll list (default values if payroll not created)
 */

exports.getCounselorPayrollList = async (req, res) => {
  logger.info("Fetching counselor payroll list");

  try {
    const { page, limit, sortBy, sortOrder } = getPaginationParams(
      req,
      [
        "fullName",
        "netSalary",
        "grossSalary",
        "totalEarnings",
        "totalDeductions",
        "payrollMonth",
      ],
      "fullName",
    );

    /* -------------------------
       FETCH COUNSELORS (SECONDARY DB)
    -------------------------- */
    const counselors = await User.findAll({
      where: { role: 2, status: 1 },
      attributes: ["id", "fullname"],
      raw: true,
    });

    logger.info(`Fetched ${counselors.length} counselors`);

    /* -------------------------
       FETCH PAYROLLS (PRIMARY DB)
    -------------------------- */
    const payrolls = await counselorPayroll.findAll({
      where: { isDeleted: false },
      raw: true,
    });

    const payrollMap = {};
    payrolls.forEach((p) => {
      payrollMap[p.counselorId] = p;
    });

    /* -------------------------
       MERGE RESULT
    -------------------------- */
    let result = counselors.map((c) => {
      const payroll = payrollMap[c.id];

      return {
        id: payroll?.id,
        counselorId: c.id,
        fullName: c.fullname,

        baseSalary: payroll?.baseSalary ?? 0,
        grossSalary: payroll?.grossSalary ?? 0,
        totalEarnings: payroll?.totalEarnings ?? 0,
        totalDeductions: payroll?.totalDeductions ?? 0,
        netSalary: payroll?.netSalary ?? 0,
        payrollMonth: payroll?.payrollMonth,

        payrollExists: Boolean(payroll),
        earnings:
          typeof payroll.earnings === "string"
            ? JSON.parse(payroll.earnings || "[]")
            : payroll.earnings,
        deductions:
          typeof payroll.deductions === "string"
            ? JSON.parse(payroll.deductions || "[]")
            : payroll.deductions,
      };
    });

    /* -------------------------
       BUSINESS SORT: netSalary = 0 FIRST
    -------------------------- */
    result.sort((a, b) => {
      if (a.netSalary === 0 && b.netSalary !== 0) return -1;
      if (a.netSalary !== 0 && b.netSalary === 0) return 1;
      return 0;
    });

    /* -------------------------
       DYNAMIC SORT (UI)
    -------------------------- */
    result.sort((a, b) => {
      const A = a[sortBy];
      const B = b[sortBy];

      if (A == null) return 1;
      if (B == null) return -1;

      return sortOrder === "ASC" ? (A > B ? 1 : -1) : A < B ? 1 : -1;
    });

    /* -------------------------
       PAGINATION
    -------------------------- */
    const totalRecords = result.length;
    const start = (page - 1) * limit;
    const paginatedData = result.slice(start, start + limit);

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        totalRecords,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(totalRecords / limit),
        sortBy,
        sortOrder,
      },
    });
  } catch (err) {
    logger.error("Failed to fetch counselor payroll list", {
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch counselor payroll list",
    });
  }
};

/**
 * CREATE / UPDATE counselor payroll
 */
exports.createOrUpdatePayroll = async (req, res) => {
  const payload = req.body;

  logger.info("Saving counselor payroll", {
    counselorId: payload.counselorId,
  });

  try {
    const [payroll, created] = await counselorPayroll.upsert(
      {
        counselorId: payload.counselorId,
        payrollMonth: payload.payrollMonth,

        baseSalary: payload.baseSalary,
        grossSalary: payload.grossSalary,

        earnings: payload.earnings || [],
        totalEarnings: payload.totalEarnings || 0,

        deductions: payload.deductions || [],
        totalDeductions: payload.totalDeductions || 0,

        netSalary: payload.netSalary,
        updatedBy: payload.userId,
      },
      { returning: true },
    );

    logger.info(`counselor payroll ${created ? "created" : "updated"}`, {
      counselorId: payload.counselorId,
    });

    await PayrollAudit.create({
      payrollId: payroll.id,
      staffId: payroll.counselorId,
      staffType: "COUNSELOR",
      action: "CREATE",
      newData: payroll.toJSON(),
      changedBy: req.user?.id,
    });

    res.json({
      success: true,
      message: created ? "Payroll created" : "Payroll updated",
      data: payroll,
    });
  } catch (err) {
    logger.error("counselor payroll save failed", {
      error: err.message,
      stack: err.stack,
      payload,
    });

    res.status(500).json({ success: false, message: "Payroll save failed" });
  }
};

/* =========================
   COUNSELOR PAYROLL SUMMARY
   (CURRENT MONTH)
========================= */
exports.getCounselorPayrollSummary = async (req, res) => {
  try {
    // Current month range
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(
      startOfMonth.getFullYear(),
      startOfMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    /* -------------------------
       TOTAL ACTIVE COUNSELORS
    -------------------------- */
    const totalCounselors = await User.count({
      where: {
        role: 2, // counselor
        status: 1, // active
      },
    });

    console.log(totalCounselors, "oooo");

    /* -------------------------
       COMPLETED PAYROLLS
    -------------------------- */
    const completedPayrolls = await counselorPayroll.count({
      where: {
        isDeleted: false,
        payrollMonth: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
    });
    console.log("5555");

    /* -------------------------
       PENDING PAYROLLS
    -------------------------- */
    const pendingPayrolls = totalCounselors - completedPayrolls;

    res.json({
      success: true,
      data: {
        total: totalCounselors,
        completed: completedPayrolls,
        pending: pendingPayrolls < 0 ? 0 : pendingPayrolls,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch counselor payroll summary",
    });
  }
};

/* =========================
   UPDATE COUNSELOR PAYROLL
========================= */
exports.updateCounselorPayroll = async (req, res) => {
  const { id } = req.params;
  const payload = req.body;

  try {
    const payroll = await counselorPayroll.findOne({
      where: { id, isDeleted: false },
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Counselor payroll not found",
      });
    }

    const oldData = payroll.toJSON();
    const changedFields = Object.keys(req.body);

    await payroll.update({
      payrollMonth: payload.payrollMonth,
      baseSalary: payload.baseSalary,
      grossSalary: payload.grossSalary,

      earnings: payload.earnings || [],
      totalEarnings: payload.totalEarnings || 0,

      deductions: payload.deductions || [],
      totalDeductions: payload.totalDeductions || 0,

      netSalary: payload.netSalary,
      updatedBy: payload.userId,
    });

    await PayrollAudit.create({
      payrollId: payroll.id,
      staffId: payroll.counselorId,
      staffType: "COUNSELOR",
      action: "UPDATE",
      oldData,
      newData: payroll.toJSON(),
      changedFields,
      changedBy: req.user?.id,
    });

    logger.info("Counselor payroll updated", { payrollId: id });

    res.json({
      success: true,
      message: "Counselor payroll updated successfully",
      data: payroll,
    });
  } catch (err) {
    logger.error("Update counselor payroll failed", {
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      success: false,
      message: "Failed to update counselor payroll",
    });
  }
};

/* =========================
   DELETE COUNSELOR PAYROLL
========================= */
exports.deleteCounselorPayroll = async (req, res) => {
  const { id } = req.params;

  try {
    const payroll = await counselorPayroll.findOne({
      where: { id, isDeleted: false },
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Counselor payroll not found",
      });
    }

    await payroll.update({
      isDeleted: true,
      updatedBy: req.user?.id,
    });

    logger.info("Counselor payroll deleted", { payrollId: id });

    res.json({
      success: true,
      message: "Counselor payroll deleted successfully",
    });
  } catch (err) {
    logger.error("Delete counselor payroll failed", {
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      success: false,
      message: "Failed to delete counselor payroll",
    });
  }
};
