/* ==========================
   IMPORTS
========================== */
const StaffSalary = require("../../models/primary/StaffSalary");
const StaffPayroll = require("../../models/primary/StaffPayroll");
const CounselorPayroll = require("../../models/primary/CounselorPayroll");
const PrimaryUser = require("../../models/primary/User");
const logger = require("../../utils/logger"); // ✅ central logger

/* ==========================
   HELPERS
========================== */
function getSalaryDatesFromPayrollMonth(payrollMonth) {
  const d = new Date(payrollMonth);
  return {
    salaryDate: new Date(d.getFullYear(), d.getMonth(), 8),
    dueDate: new Date(d.getFullYear(), d.getMonth(), 9),
    finalDueDate: new Date(d.getFullYear(), d.getMonth(), 10),
  };
}

// ✅ ADMIN USER (roleId = 1)
async function getAdminUser() {
  const adminUser = await PrimaryUser.findOne({
    where: {
      roleId: 1,
      isDeleted: false,
    },
    attributes: ["id"],
  });

  if (!adminUser) {
    throw new Error("❌ Admin user (roleId = 1) not found");
  }

  return adminUser;
}

/* ==========================
   MAIN CRON
========================== */
async function generateStaffSalary() {
  try {
    logger.info("🔄 Staff & Counselor salary cron started");

    /* --------------------------
       ADMIN USER
    --------------------------- */
    const adminUser = await getAdminUser();
    logger.info(`🛠️ Cron executed by Admin ID: ${adminUser.id}`);

    // =========================
    // STAFF PAYROLL
    // =========================
    const staffPayrolls = await StaffPayroll.findAll({
      where: { isDeleted: false },
    });

    for (const payroll of staffPayrolls) {
      const { salaryDate, dueDate, finalDueDate } =
        getSalaryDatesFromPayrollMonth(payroll.payrollMonth);

      const exists = await StaffSalary.findOne({
        where: {
          staffId: payroll.staffId,
          payrollMonth: payroll.payrollMonth,
          type: "STAFF",
        },
      });

      if (exists) continue;

      await StaffSalary.create({
        staffPayrollId: payroll.id,
        staffId: payroll.staffId,
        amount: payroll.netSalary,
        payrollMonth: payroll.payrollMonth,
        salaryDate,
        dueDate,
        finalDueDate,
        type: "STAFF",
        status: "Pending",
        createdBy: adminUser.id,   // ✅ dynamic
        updatedBy: adminUser.id,
      });

      logger.info(
        `🟢 Staff salary created | staffId: ${payroll.staffId}, month: ${payroll.payrollMonth}`
      );
    }

    // =========================
    // COUNSELOR PAYROLL
    // =========================
    const counselorPayrolls = await CounselorPayroll.findAll({
      where: { isDeleted: false },
    });

    for (const payroll of counselorPayrolls) {
      const { salaryDate, dueDate, finalDueDate } =
        getSalaryDatesFromPayrollMonth(payroll.payrollMonth);

      const exists = await StaffSalary.findOne({
        where: {
          counselorId: payroll.counselorId,
          payrollMonth: payroll.payrollMonth,
          type: "COUNSELOR",
        },
      });

      if (exists) continue;

      await StaffSalary.create({
        counselorPayrollId: payroll.id,
        counselorId: payroll.counselorId,
        amount: payroll.netSalary,
        payrollMonth: payroll.payrollMonth,
        salaryDate,
        dueDate,
        finalDueDate,
        type: "COUNSELOR",
        status: "Pending",
        createdBy: adminUser.id,   // ✅ dynamic
        updatedBy: adminUser.id,
      });

      logger.info(
        `🟢 Counselor salary created | counselorId: ${payroll.counselorId}, month: ${payroll.payrollMonth}`
      );
    }

    logger.info("🎉 Staff & Counselor salary cron completed");
  } catch (error) {
    logger.error("❌ Staff & Counselor salary cron failed", {
      message: error.message,
      sqlMessage: error?.parent?.sqlMessage,
      sqlCode: error?.parent?.code,
      errors: error.errors,
      stack: error.stack,
    });
  }
}

generateStaffSalary();
