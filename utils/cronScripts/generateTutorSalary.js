/* ==========================
   IMPORTS
========================== */
const { Op } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const logger = require("../../utils/logger");

// Primary DB
const TutorSalary = require("../../models/primary/TutorSalary");
const TutorPayroll = require("../../models/primary/TutorPayroll");
const TutorPayRule = require("../../models/primary/TutorPayRule");
const ClassRange = require("../../models/primary/ClassRange");
const BasePay = require("../../models/primary/BasePay");
const PrimaryUser = require("../../models/primary/User");

// Secondary DB
const SecondaryUser = require("../../models/secondary/User");
const ClassSchedule = require("../../models/secondary/ClassSchedule");
const SecondaryClass = require("../../models/secondary/Class");
const Attendance = require("../../models/secondary/Attndance");

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
  return await PrimaryUser.findOne({
    where: {
      department: "Finance",
      position: "Manager",
      roleId: 3,
      isDeleted: false,
    },
    attributes: ["id"],
  });
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
async function generateTutorSalary() {
  try {
    logger.info("🔄 Tutor Salary cron started");

    const payrollMonth = "2025-09-01";
    const d = new Date(payrollMonth);
    const startDate = new Date(d.getFullYear(), d.getMonth(), 1);
    const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0);

    /* --------------------------
       PAY RULE
    --------------------------- */
    const payRuleRow = await TutorPayRule.findOne({
      where: { isDeleted: false },
    });
    if (!payRuleRow) {
      logger.error("❌ Tutor pay rule missing");
      return;
    }
    const rule = payRuleRow.config;

    /* --------------------------
       USERS
    --------------------------- */
    const financeManager = await getFinanceManager();
    if (!financeManager) {
      logger.error("❌ Finance Manager not found");
      return;
    }

    const adminUser = await getAdminUser();
    logger.info(`🛠️ Cron executed by Admin ID: ${adminUser.id}`);

    /* --------------------------
       FETCH TUTORS
    --------------------------- */
    const tutors = await SecondaryUser.findAll({
      where: { role: 3 },
      attributes: ["id", "name"],
    });

    for (const tutor of tutors) {
      const tutorId = tutor.id;

      /* --------------------------
         DUPLICATE CHECK
      --------------------------- */
      const exists = await TutorPayroll.findOne({
        where: { tutorId, payrollMonth, isDeleted: false },
      });
      if (exists) continue;

      /* --------------------------
         FETCH SCHEDULES
      --------------------------- */
      const schedules = await ClassSchedule.findAll({
        where: {
          tutor: tutorId,
          status: 2,
          [Op.or]: [
            { start: { [Op.between]: [startDate, endDate] } },
            { end: { [Op.between]: [startDate, endDate] } },
          ],
        },
        attributes: ["id", "class_id", "duration"],
      });
      if (!schedules.length) continue;

      let totalBasePay = 0;
      let totalClasses = 0;

      /* --------------------------
         BASE PAY CALCULATION
      --------------------------- */
      for (const sc of schedules) {
        if (!sc.duration || sc.duration <= 0) continue;

        const classUnits = sc.duration / 60;
        totalClasses += classUnits;

        const cls = await SecondaryClass.findOne({
          where: { id: sc.class_id },
          attributes: ["classnumber"],
        });
        if (!cls) continue;

        const classNumber = parseInt(cls.classnumber);
        if (isNaN(classNumber)) continue;

        const classRange = await ClassRange.findOne({
          where: {
            fromClass: { [Op.lte]: classNumber },
            toClass: { [Op.gte]: classNumber },
            isDeleted: false,
          },
        });
        if (!classRange) continue;

        const basePayRow = await BasePay.findOne({
          where: { classRangeId: classRange.id, isDeleted: false },
        });
        if (!basePayRow) continue;

        totalBasePay += basePayRow.basePay * classUnits;
      }

      /* --------------------------
         ATTENDANCE
      --------------------------- */
      const attendedClasses = await Attendance.count({
        where: {
          class_id: { [Op.in]: schedules.map((s) => s.id) },
          isattendanceconfirmed: 1,
          user_id: tutorId,
        },
      });
      const missedClasses = schedules.length - attendedClasses;

      /* --------------------------
         PAY RULE CALCULATION
      --------------------------- */
      let incrementAmount = 0;
      let deductionAmount = 0;
      const earnings = [];
      const deductions = [];
      const threshold = rule.monthly_threshold;

      if (missedClasses > 0) {
        const dec =
          totalClasses >= threshold
            ? rule.above_threshold.decrement
            : rule.below_threshold.decrement;
        deductionAmount = missedClasses * dec;

        deductions.push({
          type: "MISSED_CLASS",
          missedClasses,
          perClass: dec,
          amount: deductionAmount,
        });
      } else {
        if (totalClasses >= threshold) {
          for (const r of rule.above_threshold.rules) {
            const inc = (totalBasePay * r.increment) / 100;
            incrementAmount += inc;
            earnings.push({
              type: "ABOVE_THRESHOLD_PERCENT",
              percentage: r.increment,
              amount: inc,
            });
          }
        } else {
          incrementAmount = attendedClasses * rule.below_threshold.increment;
          earnings.push({
            type: "BELOW_THRESHOLD_PER_CLASS",
            attendedClasses,
            perClass: rule.below_threshold.increment,
            amount: incrementAmount,
          });
        }
      }

      const grossSalary = totalBasePay + incrementAmount;
      const netSalary = grossSalary - deductionAmount;
      const { salaryDate, dueDate, finalDueDate } =
        getSalaryDatesFromPayrollMonth(payrollMonth);

      /* --------------------------
         TRANSACTION
      --------------------------- */
      const transaction = await sequelizePrimary.transaction();
      try {
        const payroll = await TutorPayroll.create(
          {
            tutorId,
            payrollMonth,
            totalClasses,
            attendedClasses,
            missedClasses,
            baseSalary: totalBasePay,
            grossSalary,
            netSalary,
            earnings,
            totalEarnings: incrementAmount,
            deductions,
            totalDeductions: deductionAmount,
            createdBy: adminUser.id,
            updatedBy: adminUser.id,
          },
          { transaction }
        );

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
            assignedTo: financeManager.id,
            createdBy: adminUser.id,
            updatedBy: adminUser.id,
          },
          { transaction }
        );

        await transaction.commit();
        logger.info(`✅ Salary created | Tutor:${tutorId} | Net:${netSalary}`);
      } catch (err) {
        await transaction.rollback();
        logger.error(`❌ Failed for Tutor ${tutorId}`, {
          message: err.message,
          stack: err.stack,
        });
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
