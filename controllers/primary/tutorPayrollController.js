// controllers/tutorPayroll.controller.js
const User = require("../../models/secondary/User");
const TutorPayroll = require("../../models/primary/TutorPayroll");
const logger = require("../../utils/logger"); // your logger instance

exports.getTutorsPayrollList = async (req, res) => {
  logger.info(`Fetching tutor payroll list`);

  try {
    // 1️⃣ Get tutors from secondary DB
    const tutors = await User.findAll({
      where: { role: 3, status: 1 },
      attributes: ["id", "fullname"],
      raw: true,
    });
    logger.info(`Fetched ${tutors.length} tutors from secondary DB`);

    // 2️⃣ Get existing payrolls from primary DB
    const payrolls = await TutorPayroll.findAll({
      where: { isDeleted: false },
      raw: true,
    });
    logger.info(`Fetched ${payrolls.length} payroll records from primary DB`);

    // Convert payrolls to map for quick lookup
    const payrollMap = {};
    payrolls.forEach((p) => {
      payrollMap[p.councilorId] = p;
    });

    // 3️⃣ Build response
    const result = tutors.map((tutor) => {
      const payroll = payrollMap[tutor.id];
      return {
        tutorId: tutor.id,
        fullName: tutor.fullname,
        baseSalary: payroll?.baseSalary ?? 0,
        grossSalary: payroll?.grossSalary ?? 0,
        totalEarnings: payroll?.totalEarnings ?? 0,
        totalDeductions: payroll?.totalDeductions ?? 0,
        netSalary: payroll?.netSalary ?? 0,
        payrollExists: !!payroll,
      };
    });

    logger.info(
      `Successfully built payroll response for ${result.length} tutors`
    );
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(`Failed to fetch tutor payroll list: ${err.message}`, {
      stack: err.stack,
    });
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch tutor payroll list" });
  }
};

exports.createOrUpdatePayroll = async (req, res) => {
  const payload = req.body;
  logger.info(
    `Saving payroll for tutorId: ${payload.councilorId}, month: ${payload.payrollMonth}`,
    { payload }
  );

  try {
    const [payroll, created] = await TutorPayroll.upsert(
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
      `Payroll ${created ? "created" : "updated"} successfully for tutorId: ${
        payload.councilorId
      }`,
      { payroll }
    );

    res.json({
      success: true,
      message: created ? "Payroll created" : "Payroll updated",
      data: payroll,
    });
  } catch (err) {
    logger.error(
      `Failed to save payroll for tutorId: ${payload.councilorId} - ${err.message}`,
      { stack: err.stack, payload }
    );
    res.status(500).json({ success: false, message: "Payroll save failed" });
  }
};
