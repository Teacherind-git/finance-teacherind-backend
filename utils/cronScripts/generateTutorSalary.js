const TutorSalary = require("../../models/primary/TutorSalary");
const TutorPayroll = require("../../models/primary/TutorPayroll");

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
  const staffPayrolls = await TutorPayroll.findAll({
    where: { isDeleted: false },
  });

  for (const payroll of staffPayrolls) {
    const { salaryDate, dueDate, finalDueDate } =
      getSalaryDatesFromPayrollMonth(payroll.payrollMonth);

    const exists = await TutorSalary.findOne({
      where: {
        tutorId: payroll.tutorId,
        payrollMonth: payroll.payrollMonth,
        type: "TUTOR",
      },
    });

    if (exists) continue;
    console.log(payroll);
    

    // await StaffSalary.create({
    //   payrollId: payroll.id,
    //   staffId: payroll.staffId,
    //   amount: payroll.netSalary,
    //   payrollMonth: payroll.payrollMonth,
    //   salaryDate,
    //   dueDate,
    //   finalDueDate,
    //   type: "STAFF",
    //   status: "Pending",
    //   createdBy: 10,
    // });
  }

  console.log("✅ Salary generation completed");
}
generateStaffSalary();
