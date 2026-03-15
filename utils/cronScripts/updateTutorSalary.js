/* ==========================
   IMPORTS
========================== */
const { Op } = require("sequelize");
const TutorSalary = require("../../models/primary/TutorSalary");
const PrimaryUser = require("../../models/primary/User");
const logger = require("../../utils/logger");

/* ==========================
   ADMIN USER
========================== */
async function getAdminUser() {
  const user = await PrimaryUser.findOne({
    where: { roleId: 1, isDeleted: false },
    attributes: ["id"],
  });

  if (!user) throw new Error("Admin user not found");
  return user;
}

/* ==========================
   MAIN CRON
========================== */
async function updateTutorSalaryStatus() {
  try {
    logger.info("🔄 Tutor salary status cron started");

    const adminUser = await getAdminUser();
    const adminUserId = adminUser.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salaries = await TutorSalary.findAll({
      where: {
        type: "TUTOR",
        status: { [Op.not]: "Paid" },
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
          updatedBy: adminUserId,
        });

        logger.info(
          `🔁 TutorSalary updated | id:${salary.id} | status:${newStatus}`
        );
      }
    }

    logger.info("🎉 Tutor salary status cron completed");
  } catch (error) {
    logger.error("❌ Tutor salary status cron failed", {
      message: error.message,
      stack: error.stack,
    });
  }
}

updateTutorSalaryStatus();