const StaffSalary = require("../../models/primary/StaffSalary");
const StaffPayroll = require("../../models/primary/StaffPayroll");
const CounselorPayroll = require("../../models/primary/CounselorPayroll");

function getSalaryDatesFromPayrollMonth(payrollMonth) {
  const d = new Date(payrollMonth);
  return {
    salaryDate: new Date(d.getFullYear(), d.getMonth(), 8),
    dueDate: new Date(d.getFullYear(), d.getMonth(), 9),
    finalDueDate: new Date(d.getFullYear(), d.getMonth(), 10),
  };
}

async function generateStaffSalary() {
  console.log("🔄 Salary cron started");

  // ✅ STAFF PAYROLL
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
      payrollId: payroll.id,
      staffId: payroll.staffId,
      amount: payroll.netSalary,
      payrollMonth: payroll.payrollMonth,
      salaryDate,
      dueDate,
      finalDueDate,
      type: "STAFF",
      status: "Pending",
      createdBy: 10,
    });
  }

  // ✅ COUNSELOR PAYROLL
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
      payrollId: payroll.id,
      counselorId: payroll.counselorId,
      amount: payroll.netSalary,
      payrollMonth: payroll.payrollMonth,
      salaryDate,
      dueDate,
      finalDueDate,
      type: "COUNSELOR",
      status: "Pending",
      createdBy: 10,
    });
  }

  console.log("✅ Salary generation completed");
}
generateStaffSalary();
