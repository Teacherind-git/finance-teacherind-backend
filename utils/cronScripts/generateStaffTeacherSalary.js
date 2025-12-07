const cron = require("node-cron");
const Staff = require("../../models/Staff/Staff");
const StaffSalarySetup = require("../../models/Staff/StaffSalarySetup");
const StaffSalaryBill = require("../../models/Staff/StaffSalaryBill");

// 🔁 Runs every month on 8th day at 00:05 AM
cron.schedule("5 0 8 * *", async () => {
  console.log("🚀 Running Staff Salary Generation Job");

  try {
    const staffList = await Staff.findAll({
      include: [
        {
          model: StaffSalarySetup,
          where: { status: "Active" },
          required: true,
        },
      ],
    });

    for (const staff of staffList) {
      const exists = await StaffSalaryBill.findOne({
        where: {
          staffId: staff.id,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        },
      });

      if (exists) {
        console.log(`⏭ Salary already exists for staff #${staff.id}`);
        continue;
      }
      const salary = staff.staff_salary_setups[0];

      await StaffSalaryBill.create({
        staffId: staff.id,
        basicSalary: salary.basicSalary,
        hra: salary.hra,
        allowance: salary.allowance,
        deduction: salary.deduction,
        netSalary: salary.netSalary,
        billDate: new Date(),
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        status: "Pending",
        createdBy: 1, // system admin
      });

      console.log(`✅ Salary generated for staff #${staff.id}`);
    }
  } catch (error) {
    console.error("❌ Salary generation failed:", error);
  }
});

module.exports = {};
