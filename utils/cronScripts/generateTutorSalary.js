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

  if (typeof classes === "string" && classes.startsWith("[")) {
    try {
      return JSON.parse(classes).map(Number);
    } catch {
      return [];
    }
  }

  return classes
    .toString()
    .split(",")
    .map((c) => Number(c.trim()))
    .filter((n) => !isNaN(n));
}

function getSalaryDatesFromPayrollMonth(payrollMonth) {
  const d = new Date(payrollMonth);

  // move to next month
  const salaryMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

  return {
    salaryDate: new Date(salaryMonth.getFullYear(), salaryMonth.getMonth(), 8),
    dueDate: new Date(salaryMonth.getFullYear(), salaryMonth.getMonth(), 9),
    finalDueDate: new Date(
      salaryMonth.getFullYear(),
      salaryMonth.getMonth(),
      10,
    ),
  };
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

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

async function generateTutorSalary() {
  logger.info("🔄 Tutor Salary cron started");

  try {
    const now = new Date();

    // previous month
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const payrollMonth = targetMonth;

    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    logger.info(`Payroll month: ${formatMonth(payrollMonth)}`);

    /* --------------------------
       SYSTEM USERS
    --------------------------- */

    const adminUser = await getAdminUser();

    const adminUserId = Number(adminUser.dataValues.id);

    logger.info(`🛠️ Cron executed by Admin ID: ${adminUserId}`);

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
      const breakdownRows = [];
      const tutorClasses = normalizeClasses(tutor.classes);

      if (!Array.isArray(tutorClasses) || tutorClasses.length === 0) {
        logger.warn(`⚠️ Tutor ${tutorId} has invalid classes`, {
          raw: tutor.classes,
        });
        continue;
      }

      logger.info(`➡️ Processing Tutor ${tutorId}`);

      /* --------------------------
         FETCH SCHEDULES
      --------------------------- */
      const schedules = await ClassSchedule.findAll({
        where: {
          tutor: tutorId,
          start: {
            [Op.between]: [
              `${formatDate(startDate)} 00:00:00`,
              `${formatDate(endDate)} 23:59:59`,
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
      let totalClasses = schedules.length;
      let attendedClasses = 0;
      let missedClasses = 0;
      let rescheduledClasses = 0;

      /* --------------------------
         SALARY CALCULATION
      --------------------------- */

      for (const sc of schedules) {
        if (!sc.duration || sc.duration <= 0) continue;

        const classUnits = sc.duration / 60;

        // Track counts (optional, for reporting)
        if (sc.status === 2) attendedClasses += classUnits;
        if (sc.status === 0) missedClasses += classUnits;
        if (sc.status === 3) rescheduledClasses += classUnits;

        // ✅ ONLY process salary if attended
        if (sc.status !== 2) continue;

        const secClass = await SecondaryClass.findOne({
          where: { id: sc.class_id },
          attributes: ["classnumber", "syllabusname", "student"],
        });

        const student = await SecondaryUser.findOne({
          where: { id: secClass.student },
          attributes: ["name"],
        });

        if (!secClass) continue;

        const primaryClass = await PrimaryClass.findOne({
          where: { number: secClass.classnumber },
          attributes: ["id"],
        });

        let primarySyllabus = await PrimarySyllabus.findOne({
          where: { name: secClass.syllabusname },
          attributes: ["id"],
        });

        // ✅ fallback only if NCERT not found in payroll
        let payrollItem = null;

        if (primarySyllabus) {
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

        // ✅ fallback: NCERT → CBSE
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

        // ✅ FINAL: only attended class contributes
        totalBasePay += payrollItem.basePay * classUnits;
        // Add breakdown row
        if (sc.status === 2) {
          breakdownRows.push({
            tutorId,
            classNumber: secClass.classnumber,
            syllabusName: secClass.syllabusname,
            studentName: student?.name || null,
            basePay: payrollItem.basePay,
            duration: sc.duration,
            classUnits: 1,
            amount: payrollItem.basePay, // pay only for 1 class
            status: sc.status,
            createdBy: adminUserId,
            updatedBy: adminUserId,
          });
        }
      }

      if (totalBasePay <= 0) {
        logger.warn(`⚠️ No payable amount for Tutor ${tutorId}`);
        continue;
      }

      /* --------------------------
         PAY RULE CALCULATION
      --------------------------- */

      const incrementAmount = 0;
      const deductionAmount = 0;

      const grossSalary = totalBasePay + incrementAmount;
      const netSalary = grossSalary - deductionAmount;

      const { salaryDate, dueDate, finalDueDate } =
        getSalaryDatesFromPayrollMonth(payrollMonth);

      /* --------------------------
         CREATE / UPDATE PAYROLL
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
              baseSalary:totalBasePay,
              grossSalary: totalBasePay,
              grossSalary,
              netSalary,
              totalEarnings: incrementAmount,
              totalDeductions: deductionAmount,
              updatedBy: adminUserId,
            },
            { transaction },
          );
        }

        /* --------------------------
           CREATE SALARY
        --------------------------- */

        let salary = await TutorSalary.findOne({
          where: {
            tutorId,
            payrollMonth: {
              [Op.between]: [startDate, endDate],
            },
            isDeleted: false,
          },
          transaction,
        });

        if (salary) {
          logger.info(`🔄 Updating existing salary for Tutor ${tutorId}`);

          await salary.update(
            {
              amount: netSalary,
              salaryDate,
              dueDate,
              finalDueDate,
              assignedTo: null,
              updatedBy: adminUserId,
            },
            { transaction },
          );
        } else {
          logger.info(`🆕 Creating new salary for Tutor ${tutorId}`);

          salary = await TutorSalary.create(
            {
              payrollId: payroll?.id,
              payrollMonth,
              tutorId,
              type: "TUTOR",
              amount: netSalary,
              salaryDate,
              dueDate,
              finalDueDate,
              status: "Pending",
              assignedTo: null,
              createdBy: adminUserId,
              updatedBy: adminUserId,
            },
            { transaction },
          );
        }

        // delete old (if re-run)
        await TutorSalaryBreakdown.destroy({
          where: { salaryId: salary.id },
          transaction,
        });

        // insert new
        await TutorSalaryBreakdown.bulkCreate(
          breakdownRows.map((row) => ({
            ...row,
            salaryId: salary.id,
            payrollId: payroll.id,
          })),
          { transaction },
        );

        await transaction.commit();

        logger.info(
          `🎉 Payroll processed | Tutor:${tutorId} | Net Salary:${netSalary}`,
        );
      } catch (err) {
        await transaction.rollback();

        logger.error(
          `❌ Failed payroll/salary operation for Tutor ${tutorId}`,
          {
            message: err.message,
          },
        );
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
