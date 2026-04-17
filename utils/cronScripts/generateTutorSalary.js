/* ==========================
   IMPORTS
========================== */
const { Op } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const logger = require("../../utils/cronLogger");

// ===== PRIMARY DB =====
const TutorSalary = require("../../models/primary/TutorSalary");
const TutorPayroll = require("../../models/primary/TutorPayroll");
const TutorPayrollItem = require("../../models/primary/TutorPayrollItem");
const PrimaryUser = require("../../models/primary/User");
const PrimaryClass = require("../../models/primary/Class");
const PrimarySyllabus = require("../../models/primary/Syllabus");
const TutorSalaryBreakdown = require("../../models/primary/TutorSalaryBreakdown");

// ===== SECONDARY DB =====
const SecondaryUser = require("../../models/secondary/User");
const ClassSchedule = require("../../models/secondary/ClassSchedule");
const SecondaryClass = require("../../models/secondary/Class");

/* ==========================
   HELPERS
========================== */

function normalizeClasses(classes) {
  if (!classes) return [];
  if (Array.isArray(classes)) return classes.map(Number);

  try {
    if (typeof classes === "string" && classes.startsWith("[")) {
      return JSON.parse(classes).map(Number);
    }
  } catch {}

  return classes
    .toString()
    .split(",")
    .map((c) => Number(c.trim()))
    .filter((n) => !isNaN(n));
}

function getSalaryDates(payrollMonth) {
  const d = new Date(payrollMonth);
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

  return {
    salaryDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 8),
    dueDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 9),
    finalDueDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10),
  };
}

function dateStr(date) {
  return date.toISOString().slice(0, 10);
}

async function getAdminUserId() {
  const user = await PrimaryUser.findOne({
    where: { roleId: 1, isDeleted: false },
    attributes: ["id"],
  });

  if (!user) throw new Error("Admin user not found");
  return Number(user.id);
}

/* ==========================
   MAIN CRON
========================== */

async function generateTutorSalary() {
  logger.info("🔄 Tutor Salary Cron Started");

  try {
    // Previous month
    const now = new Date();
    const payrollMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const startDate = new Date(
      payrollMonth.getFullYear(),
      payrollMonth.getMonth(),
      1
    );
    const endDate = new Date(
      payrollMonth.getFullYear(),
      payrollMonth.getMonth() + 1,
      0
    );

    logger.info(`📅 Payroll Month: ${dateStr(payrollMonth)}`);

    const adminUserId = await getAdminUserId();
    logger.info(`👤 Cron executed by Admin ID: ${adminUserId}`);

    /* --------------------------
       FETCH TUTORS
    --------------------------- */
    const tutors = await SecondaryUser.findAll({
      where: { role: 3 },
      attributes: ["id", "classes"],
    });

    logger.info(`👨‍🏫 Tutors Found: ${tutors.length}`);

    /* --------------------------
       PROCESS EACH TUTOR
    --------------------------- */
    for (const tutor of tutors) {
      const tutorId = tutor.id;

      logger.info(`➡️ Processing Tutor: ${tutorId}`);

      const tutorClasses = normalizeClasses(tutor.classes);

      if (!tutorClasses.length) {
        logger.warn(`⚠️ Tutor ${tutorId} has invalid/no classes`);
        continue;
      }

      /* --------------------------
         FETCH CLASS SCHEDULES
      --------------------------- */
      const schedules = await ClassSchedule.findAll({
        where: {
          tutor: tutorId,
          start: {
            [Op.between]: [
              `${dateStr(startDate)} 00:00:00`,
              `${dateStr(endDate)} 23:59:59`,
            ],
          },
        },
        attributes: ["id", "class_id", "duration", "status"],
      });

      if (!schedules.length) {
        logger.warn(`⚠️ No schedules found for Tutor ${tutorId}`);
        continue;
      }

      let totalBasePay = 0;
      let attendedCount = 0;
      const breakdownRows = [];

      /* --------------------------
         PROCESS EACH CLASS
      --------------------------- */
      for (const sc of schedules) {
        if (sc.status !== 2) continue; // Only attended

        const secClass = await SecondaryClass.findOne({
          where: { id: sc.class_id },
          attributes: ["classnumber", "syllabusname", "student"],
        });

        if (!secClass) continue;

        const student = await SecondaryUser.findOne({
          where: { id: secClass.student },
          attributes: ["name"],
        });

        const primaryClass = await PrimaryClass.findOne({
          where: { number: secClass.classnumber },
          attributes: ["id"],
        });

        const primarySyllabus = await PrimarySyllabus.findOne({
          where: { name: secClass.syllabusname },
          attributes: ["id"],
        });

        let payrollItem = null;

        if (primaryClass && primarySyllabus) {
          payrollItem = await TutorPayrollItem.findOne({
            where: {
              tutorId,
              classId: primaryClass.id,
              syllabusId: primarySyllabus.id,
              isDeleted: false,
            },
            attributes: ["basePay"],
          });
        }

        // NCERT fallback → CBSE
        if (!payrollItem && secClass.syllabusname === "NCERT") {
          const cbseSyllabus = await PrimarySyllabus.findOne({
            where: { name: "CBSE" },
            attributes: ["id"],
          });

          if (cbseSyllabus) {
            payrollItem = await TutorPayrollItem.findOne({
              where: {
                tutorId,
                classId: primaryClass.id,
                syllabusId: cbseSyllabus.id,
                isDeleted: false,
              },
              attributes: ["basePay"],
            });
          }
        }

        if (!payrollItem) continue;

        attendedCount++;

        totalBasePay += payrollItem.basePay;

        breakdownRows.push({
          tutorId,
          classNumber: secClass.classnumber,
          syllabusName: secClass.syllabusname,
          studentName: student?.name || null,
          basePay: payrollItem.basePay,
          duration: sc.duration,
          classUnits: 1,
          amount: payrollItem.basePay,
          status: sc.status,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        });
      }

      if (totalBasePay === 0) {
        logger.warn(`⚠️ No payable classes found for Tutor ${tutorId}`);
        continue;
      }

      /* ================================
         CALCULATE FINAL PAY VALUES
      ================================= */
      const incrementAmount = 0;
      const deductionAmount = 0;
      const netSalary = totalBasePay + incrementAmount - deductionAmount;

      const { salaryDate, dueDate, finalDueDate } =
        getSalaryDates(payrollMonth);

      /* ================================
         CREATE / UPDATE PAYROLL + SALARY
      ================================= */
      const t = await sequelizePrimary.transaction();

      try {
        let payroll = await TutorPayroll.findOne({
          where: {
            tutorId,
            payrollMonth: {
              [Op.between]: [startDate, endDate],
            },
            isDeleted: false,
          },
          transaction: t,
        });

        if (!payroll) {
          payroll = await TutorPayroll.create(
            {
              tutorId,
              payrollMonth,
              totalClasses: schedules.length,
              attendedClasses: attendedCount,
              baseSalary: totalBasePay,
              grossSalary: totalBasePay,
              netSalary,
              totalEarnings: incrementAmount,
              totalDeductions: deductionAmount,
              createdBy: adminUserId,
              updatedBy: adminUserId,
            },
            { transaction: t }
          );
        } else {
          await payroll.update(
            {
              totalClasses: schedules.length,
              attendedClasses: attendedCount,
              baseSalary: totalBasePay,
              grossSalary: totalBasePay,
              netSalary,
              totalEarnings: incrementAmount,
              totalDeductions: deductionAmount,
              updatedBy: adminUserId,
            },
            { transaction: t }
          );
        }

        let salary = await TutorSalary.findOne({
          where: {
            tutorId,
            payrollMonth: {
              [Op.between]: [startDate, endDate],
            },
            isDeleted: false,
          },
          transaction: t,
        });

        if (!salary) {
          salary = await TutorSalary.create(
            {
              tutorId,
              payrollId: payroll.id,
              payrollMonth,
              type: "TUTOR",
              amount: netSalary,
              salaryDate,
              dueDate,
              finalDueDate,
              status: "Pending",
              createdBy: adminUserId,
              updatedBy: adminUserId,
            },
            { transaction: t }
          );
        } else {
          await salary.update(
            {
              amount: netSalary,
              salaryDate,
              dueDate,
              finalDueDate,
              updatedBy: adminUserId,
            },
            { transaction: t }
          );
        }

        await TutorSalaryBreakdown.destroy({
          where: { salaryId: salary.id },
          transaction: t,
        });

        await TutorSalaryBreakdown.bulkCreate(
          breakdownRows.map((b) => ({
            ...b,
            salaryId: salary.id,
            payrollId: payroll.id,
          })),
          { transaction: t }
        );

        await t.commit();

        logger.info(
          `✔️ Salary Generated | Tutor:${tutorId} | Amount:${netSalary}`
        );
      } catch (err) {
        await t.rollback();
        logger.error(`❌ Payroll Error for Tutor ${tutorId}: ${err.message}`);
      }
    }

    logger.info("🎉 Tutor Salary Cron Completed");
  } catch (err) {
    logger.error(`❌ Cron Failed: ${err.message}`);
  }
}

generateTutorSalary();