/* ==========================
   IMPORTS
========================== */
const { Op } = require("sequelize");
const StaffSalary = require("../../models/primary/StaffSalary");
const PrimaryUser = require("../../models/primary/User");
const logger = require("../../utils/logger");

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
    throw new Error("❌ Admin user (roleId = 1) not found");
  }

  return adminUser;
}

/* ==========================
   MAIN CRON
========================== */
async function updateSalaryStatus() {
  try {
    logger.info("🔄 Salary status update cron started");

    const adminUser = await getAdminUser();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salaries = await StaffSalary.findAll({
      where: {
        isDeleted: false,
        status: {
          [Op.not]: "Paid",
        },
      },
    });

    for (const salary of salaries) {
      let newStatus = "Pending";

      const dueDate = new Date(salary.dueDate);
      const finalDueDate = new Date(salary.finalDueDate);

      dueDate.setHours(0, 0, 0, 0);
      finalDueDate.setHours(0, 0, 0, 0);

      if (today >= dueDate && today <= finalDueDate) {
        newStatus = "Due";
      }

      if (today > finalDueDate) {
        newStatus = "Overdue";
      }

      if (salary.status !== newStatus) {
        await salary.update({
          status: newStatus,
          updatedBy: adminUser.id, // ✅ added
        });

        logger.info(
          `🔁 Salary status updated | id: ${salary.id}, newStatus: ${newStatus}`
        );
      }
    }

    logger.info("🎉 Salary status update cron completed");
  } catch (error) {
    logger.error("❌ Salary status update cron failed", {
      message: error.message,
      stack: error.stack,
    });
  }
}

updateSalaryStatus();