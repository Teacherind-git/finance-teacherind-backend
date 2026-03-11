/* ==========================
   IMPORTS
========================== */
const { Op } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const logger = require("../../utils/logger");

// ===== PRIMARY DB =====
const TutorSalary = require("../../models/primary/TutorSalary");
const TutorPayroll = require("../../models/primary/TutorPayroll");
const TutorPayrollItem = require("../../models/primary/TutorPayrollItem");
const PrimaryUser = require("../../models/primary/User");
const PrimaryClass = require("../../models/primary/Class");

// ===== SECONDARY DB =====
const SecondaryUser = require("../../models/secondary/User");
const ClassSchedule = require("../../models/secondary/ClassSchedule");
const SecondaryClass = require("../../models/secondary/Class");

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

async function getFinanceManager() {
  const user = await PrimaryUser.findOne({
    where: {
      department: "Finance",
      position: "Manager",
      roleId: 3,
      isDeleted: false,
    },
    attributes: ["id"],
  });

  if (!user) throw new Error("Finance manager not found");
  return user;
}

async function getAdminUser() {
  const user = await PrimaryUser.findOne({
    where: { roleId: 1, isDeleted: false },
    attributes: ["id"],
  });

  if (!user) throw new Error("Admin user not found");
  return user;
}

function normalizeClasses(classes) {
  if (!classes) return [];

  // If already array
  if (Array.isArray(classes)) return classes.map(Number);

  // If JSON string
  if (typeof classes === "string" && classes.startsWith("[")) {
    try {
      return JSON.parse(classes).map(Number);
    } catch {
      return [];
    }
  }

  // Comma separated string OR single value
  return classes
    .toString()
    .split(",")
    .map((c) => Number(c.trim()))
    .filter((n) => !isNaN(n));
}

/* ==========================
   MAIN CRON
========================== */
async function generateTutorSalary() {
  logger.info("🔄 Tutor Salary cron started");

  try {
    const now = new Date();

    // Always generate salary for previous month
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const payrollMonth = targetMonth;

    const startDate = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      1,
    );

    const endDate = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0,
    );

    logger.info(`Payroll month: ${payrollMonth}`);
    /* --------------------------
       SYSTEM USERS
    --------------------------- */
    const financeManager = await getFinanceManager();
    const adminUser = await getAdminUser();
    logger.info(`🛠️ Cron executed by Admin ID: ${adminUser.id}`);

    /* --------------------------
       FETCH TUTORS
    --------------------------- */
    const tutors = await SecondaryUser.findAll({
      where: { role: 3 },
      attributes: ["id", "classes"],
    });

    logger.info(`👨‍🏫 Tutors found: ${tutors.length}`);

    for (const tutor of tutors) {
      const tutorId = tutor.id;
      if (tutorId == 291) {
        logger.info(`➡️ Processing Tutor ${tutorId}-${tutor}`);

        const tutorClasses = normalizeClasses(tutor.classes);

        if (!Array.isArray(tutorClasses) || tutorClasses.length === 0) {
          logger.warn(`⚠️ Tutor ${tutorId} has invalid classes`, {
            raw: tutor.classes,
          });
          continue;
        }

        /* --------------------------
         FETCH SCHEDULES
      --------------------------- */
        const schedules = await ClassSchedule.findAll({
          where: {
            tutor: tutorId,
            [Op.or]: [
              { start: { [Op.between]: [startDate, endDate] } },
              { end: { [Op.between]: [startDate, endDate] } },
            ],
          },
          attributes: ["id", "class_id", "duration", "status"],
        });

        if (!schedules.length) {
          logger.warn(`⚠️ No schedules found for Tutor ${tutorId}`);
          continue; // Skip if no schedules
        }

        let totalBasePay = 0;
        let totalClasses = 0;
        let attendedClasses = 0;
        let missedClasses = 0;

        /* --------------------------
         SALARY CALCULATION
      --------------------------- */
        for (const sc of schedules) {
          if (!sc.duration || sc.duration <= 0) continue;

          const classUnits = sc.duration / 60;
          totalClasses += classUnits;

          if (sc.status === 2) attendedClasses += classUnits;
          if (sc.status === 0) missedClasses += classUnits;

          const secClass = await SecondaryClass.findOne({
            where: { id: sc.class_id },
            attributes: ["classnumber"],
          });
          if (!secClass) continue;

          const primaryClass = await PrimaryClass.findOne({
            where: { number: secClass.classnumber },
            attributes: ["id"],
          });
          if (!primaryClass) continue;

          const payrollItem = await TutorPayrollItem.findOne({
            where: { tutorId, classId: primaryClass.id, isDeleted: false },
            attributes: ["basePay"],
          });
          if (!payrollItem) continue;
          console.log(classUnits, payrollItem.basePay);
          

          totalBasePay += payrollItem.basePay * classUnits;
        }

        // Skip if no payable amount
        if (totalBasePay <= 0) {
          logger.warn(
            `⚠️ No payable classes or base pay found for Tutor ${tutorId}`,
          );
          continue;
        }

        /* --------------------------
         PAY RULE CALCULATION
      --------------------------- */
        const incrementAmount = 0;
        const deductionAmount = 0;
        const earnings = [];
        const deductions = [];

        const grossSalary = totalBasePay + incrementAmount;
        const netSalary = grossSalary - deductionAmount;

        const { salaryDate, dueDate, finalDueDate } =
          getSalaryDatesFromPayrollMonth(payrollMonth);

        const financeManagerId =
          Number(financeManager?.dataValues?.id) ||
          Number(adminUser.dataValues.id);
        const adminUserId = Number(adminUser.dataValues.id);

        /* --------------------------
         CREATE / UPDATE PAYROLL & SALARY
      --------------------------- */
        const transaction = await sequelizePrimary.transaction();

        try {
          let payroll = await TutorPayroll.findOne({
            where: {
              tutorId,
              payrollMonth: {
                [Op.between]: [startDate, endDate],
              },
              isDeleted: false,
            },
            transaction,
          });
          if (payroll) {
            logger.info(`🔄 Updating existing payroll for Tutor ${tutorId}`);
            await payroll.update(
              {
                totalClasses,
                attendedClasses,
                missedClasses,
                baseSalary: totalBasePay,
                grossSalary,
                netSalary,
                earnings: JSON.stringify(earnings),
                totalEarnings: incrementAmount,
                deductions: JSON.stringify(deductions),
                totalDeductions: deductionAmount,
                updatedBy: adminUserId,
              },
              { transaction },
            );

            // Always create TutorSalary
            await TutorSalary.create(
              {
                payrollId: payroll.id,
                payrollMonth,
                tutorId,
                type: "TUTOR",
                amount: netSalary,
                salaryDate,
                dueDate,
                finalDueDate,
                status: "Pending",
                assignedTo: financeManagerId,
                createdBy: adminUserId,
                updatedBy: adminUserId,
              },
              { transaction },
            );
          }

          await transaction.commit();
          logger.info(
            `🎉 Payroll & TutorSalary processed | Tutor:${tutorId} | Net:${netSalary}`,
          );
        } catch (err) {
          await transaction.rollback();
          logger.error(
            `❌ Failed payroll/salary operation for Tutor ${tutorId}`,
            { message: err.message },
          );
        }
      }
    }

    logger.info("🎉 Tutor salary cron completed");
  } catch (error) {
    logger.error("❌ Tutor salary cron failed", {
      message: error.message,
      stack: error.stack,
    });
  }
}

generateTutorSalary();
