/* ==========================
   IMPORTS
========================== */
const { Op } = require("sequelize");
const TutorSalary = require("../../models/primary/TutorSalary");
const PrimaryUser = require("../../models/primary/User");
const logger = require("../../utils/cronLogger");

/* ==========================
   ADMIN USER
========================== */
async function getAdminUser() {
  const user = await PrimaryUser.findOne({
    where: {
      roleId: 1,
      isDeleted: false,
    },
    attributes: ["id"],
  });

  if (!user) throw new Error("Admin user not found");
  return user;
}

/* ==========================
   MAIN CRON
========================== */
async function updateTutorSalaryStatus() {
  logger.info("🔄 Tutor Salary Status Update Cron Started");

  try {
    const adminUser = await getAdminUser();
    const adminUserId = adminUser.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all unpaid tutor salaries
    const salaries = await TutorSalary.findAll({
      where: {
        type: "TUTOR",
        isDeleted: false,
        status: { [Op.ne]: "Paid" },
      },
    });

    logger.info(`📌 Tutor salaries to process: ${salaries.length}`);

    for (const salary of salaries) {
      let newStatus = "Pending";

      const dueDate = new Date(salary.dueDate);
      const finalDueDate = new Date(salary.finalDueDate);

      dueDate.setHours(0, 0, 0, 0);
      finalDueDate.setHours(0, 0, 0, 0);

      // Update status based on dates
      if (today >= dueDate && today <= finalDueDate) {
        newStatus = "Due";
      } else if (today > finalDueDate) {
        newStatus = "Overdue";
      }

      // Only update if status changed
      if (salary.status !== newStatus) {
        await salary.update({
          status: newStatus,
          updatedBy: adminUserId,
        });

        logger.info(
          `🔁 Status Updated | SalaryID: ${salary.id} | ${salary.status} → ${newStatus}`
        );
      }
    }

    logger.info("🎉 Tutor Salary Status Update Cron Completed");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Tutor Salary Status Update Cron Failed", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

/* ==========================
   RUN CRON
========================== */
updateTutorSalaryStatus();