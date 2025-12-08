const User = require("../../models/secondary/User");
const CouncilorPayroll = require("../../models/primary/CouncilorPayroll");
const logger = require("../../utils/logger");

/**
 * GET councilor payroll list (default values if payroll not created)
 */
exports.getCouncilorPayrollList = async (req, res) => {
  logger.info("Fetching councilor payroll list");

  try {
    // ✅ councilors from secondary DB
    const councilors = await User.findAll({
      where: {
        role: 2,        // ✅ councilor role
        status: 1,
      },
      attributes: ["id", "fullname"],
      raw: true,
    });

    logger.info(`Fetched ${councilors.length} councilors`);

    // ✅ payrolls from primary DB
    const payrolls = await CouncilorPayroll.findAll({
      where: { isDeleted: false },
      raw: true,
    });

    const payrollMap = {};
    payrolls.forEach((p) => {
      payrollMap[p.councilorId] = p;
    });

    // ✅ unify response
    const result = councilors.map((c) => {
      const payroll = payrollMap[c.id];

      return {
        councilorId: c.id,
        fullName: c.fullname,

        baseSalary: payroll?.baseSalary ?? 0,
        grossSalary: payroll?.grossSalary ?? 0,
        totalEarnings: payroll?.totalEarnings ?? 0,
        totalDeductions: payroll?.totalDeductions ?? 0,
        netSalary: payroll?.netSalary ?? 0,

        payrollExists: Boolean(payroll),
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error("Failed to fetch councilor payroll list", {
      error: err.message,
      stack: err.stack,
    });

    res
      .status(500)
      .json({ success: false, message: "Failed to fetch councilor payroll list" });
  }
};

/**
 * CREATE / UPDATE councilor payroll
 */
exports.createOrUpdatePayroll = async (req, res) => {
  const payload = req.body;

  logger.info("Saving councilor payroll", {
    councilorId: payload.councilorId,
    payrollMonth: payload.payrollMonth,
  });

  try {
    const [payroll, created] = await CouncilorPayroll.upsert(
      {
        councilorId: payload.councilorId,
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

    logger.info(
      `Councilor payroll ${created ? "created" : "updated"}`,
      { councilorId: payload.councilorId }
    );

    res.json({
      success: true,
      message: created ? "Payroll created" : "Payroll updated",
      data: payroll,
    });
  } catch (err) {
    logger.error("Councilor payroll save failed", {
      error: err.message,
      stack: err.stack,
      payload,
    });

    res
      .status(500)
      .json({ success: false, message: "Payroll save failed" });
  }
};
