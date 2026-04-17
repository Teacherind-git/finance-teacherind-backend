/* ==========================
   IMPORTS
========================== */
const { Op } = require("sequelize");
const StaffSalary = require("../../models/primary/StaffSalary");
const PrimaryUser = require("../../models/primary/User");
const logger = require("../../utils/cronLogger");

/* ==========================
   ADMIN USER
========================== */
async function getAdminUser() {
  const adminUser = await PrimaryUser.findOne({
    where: {
      roleId: 1,
      isDeleted: false,
    },
    attributes: ["id"],
  });

  if (!adminUser) {
    throw new Error("Admin user (roleId = 1) not found");
  }

  return adminUser;
}

/* ==========================
   MAIN CRON
========================== */
async function updateSalaryStatus() {
  logger.info("🔄 Staff Salary Status Update Cron Started");

  try {
    const adminUser = await getAdminUser();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all unpaid salaries
    const salaries = await StaffSalary.findAll({
      where: {
        isDeleted: false,
        status: { [Op.ne]: "Paid" },
      },
    });

    logger.info(`📌 Salaries to process: ${salaries.length}`);

    for (const salary of salaries) {
      let newStatus = "Pending";

      const dueDate = new Date(salary.dueDate);
      const finalDueDate = new Date(salary.finalDueDate);

      dueDate.setHours(0, 0, 0, 0);
      finalDueDate.setHours(0, 0, 0, 0);

      // Status logic
      if (today >= dueDate && today <= finalDueDate) {
        newStatus = "Due";
      } else if (today > finalDueDate) {
        newStatus = "Overdue";
      }

      if (salary.status !== newStatus) {
        await salary.update(
          {
            status: newStatus,
            updatedBy: adminUser.id,
          }
        );

        logger.info(
          `🔁 Status Updated | SalaryID: ${salary.id} | ${salary.status} → ${newStatus}`
        );
      }
    }

    logger.info("🎉 Staff Salary Status Update Cron Completed");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Staff Salary Status Update Cron Failed", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

/* ==========================
   RUN CRON
========================== */
updateSalaryStatus();