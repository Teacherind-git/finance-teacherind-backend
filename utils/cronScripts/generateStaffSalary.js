/* ==========================
   IMPORTS
========================== */
const StaffSalary = require("../../models/primary/StaffSalary");
const StaffPayroll = require("../../models/primary/StaffPayroll");
const CounselorPayroll = require("../../models/primary/CounselorPayroll");
const PrimaryUser = require("../../models/primary/User");

const cronLogger = require("../cronLogger"); // ✅ dedicated cron logger

/* ==========================
   HELPERS
========================== */
function getSalaryDatesFromPayrollMonth(payrollMonth) {
  const d = new Date(payrollMonth);
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

  return {
    salaryDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 8),
    dueDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 9),
    finalDueDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10),
  };
}

// ADMIN USER (roleId = 1)
async function getAdminUser() {
  const adminUser = await PrimaryUser.findOne({
    where: { roleId: 1, isDeleted: false },
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
    cronLogger.info("🔄 Staff & Counselor salary cron started");

    // ADMIN USER
    const adminUser = await getAdminUser();
    cronLogger.info("🛠 Cron executed by Admin", { adminId: adminUser.id });

    /* ==========================
       STAFF PAYROLL PROCESSING
    =========================== */
    const staffPayrolls = await StaffPayroll.findAll({
      where: { isDeleted: false },
    });

    cronLogger.info("📌 Staff payrolls fetched", {
      totalStaffPayrolls: staffPayrolls.length,
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

      if (exists) {
        cronLogger.warn("⏭ Staff salary already exists — skipped", {
          staffId: payroll.staffId,
          payrollMonth: payroll.payrollMonth,
        });
        continue;
      }

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
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      });

      cronLogger.info("🟢 Staff salary created", {
        staffId: payroll.staffId,
        month: payroll.payrollMonth,
      });
    }

    /* ==========================
       COUNSELOR PAYROLL PROCESSING
    =========================== */
    const counselorPayrolls = await CounselorPayroll.findAll({
      where: { isDeleted: false },
    });

    cronLogger.info("📌 Counselor payrolls fetched", {
      totalCounselorPayrolls: counselorPayrolls.length,
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

      if (exists) {
        cronLogger.warn("⏭ Counselor salary already exists — skipped", {
          counselorId: payroll.counselorId,
          payrollMonth: payroll.payrollMonth,
        });
        continue;
      }

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
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      });

      cronLogger.info("🟢 Counselor salary created", {
        counselorId: payroll.counselorId,
        month: payroll.payrollMonth,
      });
    }

    cronLogger.info("🎉 Staff & Counselor salary cron completed successfully");
  } catch (error) {
    cronLogger.error("❌ Staff & Counselor salary cron failed", {
      message: error.message,
      sqlMessage: error?.parent?.sqlMessage,
      sqlCode: error?.parent?.code,
      errors: error.errors,
      stack: error.stack,
    });
  }
}

generateStaffSalary();