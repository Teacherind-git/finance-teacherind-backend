const User = require("../../models/secondary/User");
const counselorPayroll = require("../../models/primary/CounselorPayroll");
const logger = require("../../utils/logger");

/**
 * GET counselor payroll list (default values if payroll not created)
 */
exports.getCounselorPayrollList = async (req, res) => {
  logger.info("Fetching counselor payroll list");

  try {
    // ✅ counselors from secondary DB
    const counselors = await User.findAll({
      where: {
        role: 2, // ✅ counselor role
        status: 1,
      },
      attributes: ["id", "fullname"],
      raw: true,
    });

    logger.info(`Fetched ${counselors.length} counselors`);

    // ✅ payrolls from primary DB
    const payrolls = await counselorPayroll.findAll({
      where: { isDeleted: false },
      raw: true,
    });

    const payrollMap = {};
    payrolls.forEach((p) => {
      payrollMap[p.counselorId] = p;
    });

    // ✅ unify response
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
      };
    });

    // ✅ sort: netSalary = 0 first
    result.sort((a, b) => {
      if (a.netSalary === 0 && b.netSalary !== 0) return -1;
      if (a.netSalary !== 0 && b.netSalary === 0) return 1;
      return 0; // keep relative order otherwise
    });

    res.json({ success: true, data: result });
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
      { returning: true }
    );

    logger.info(`counselor payroll ${created ? "created" : "updated"}`, {
      counselorId: payload.counselorId,
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
