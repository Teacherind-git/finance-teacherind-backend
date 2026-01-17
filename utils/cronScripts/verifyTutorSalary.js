/* ==========================
   IMPORTS
========================== */
const { Op } = require("sequelize");

// Primary DB
const TutorPayRule = require("../../models/primary/TutorPayRule");
const ClassRange = require("../../models/primary/ClassRange");
const BasePay = require("../../models/primary/BasePay");

// Secondary DB
const SecondaryUser = require("../../models/secondary/User");
const ClassSchedule = require("../../models/secondary/ClassSchedule");
const SecondaryClass = require("../../models/secondary/Class");
const Attendance = require("../../models/secondary/Attndance");

/* ==========================
   CONFIG (CHANGE ONLY THIS)
========================== */
const TUTOR_ID = 5;
const PAYROLL_MONTH = "2025-12-01";

/* ==========================
   MAIN VERIFY FUNCTION
========================== */
async function verifyTutorSalary() {
  console.log("🔍 Verifying tutor salary calculation...\n");

  /* --------------------------
     DATE RANGE (FIXED)
  --------------------------- */
  const d = new Date(PAYROLL_MONTH);

  const startDate = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
  endDate.setMilliseconds(-1); // ✅ 23:59:59.999 of last day

  console.log(`📅 Period: ${startDate.toISOString()} → ${endDate.toISOString()}\n`);

  /* --------------------------
     FETCH TUTOR
  --------------------------- */
  const tutor = await SecondaryUser.findByPk(TUTOR_ID, {
    attributes: ["id", "name"],
  });

  if (!tutor) {
    console.error("❌ Tutor not found");
    return;
  }

  console.log(`👤 Tutor: ${tutor.name} (ID: ${tutor.id})\n`);

  /* --------------------------
     PAY RULE
  --------------------------- */
  const payRuleRow = await TutorPayRule.findOne({
    where: { isDeleted: false },
  });

  if (!payRuleRow) {
    console.error("❌ Tutor pay rule missing");
    return;
  }

  const rule = payRuleRow.config;

  /* --------------------------
     FETCH SCHEDULES (FIXED LOGIC)
     Any class that overlaps the month
  --------------------------- */
  const schedules = await ClassSchedule.findAll({
    where: {
      tutor: tutor.id,
      status: 2,
      start: { [Op.lte]: endDate },
      end: { [Op.gte]: startDate },
    },
    attributes: ["id", "class_id", "duration", "start", "end"],
  });

  console.log(`📚 Total schedules found: ${schedules.length}\n`);

  let totalBasePay = 0;
  let totalClasses = 0;

  /* --------------------------
     BASE PAY CALCULATION
  --------------------------- */
  for (const sc of schedules) {
    if (!sc.duration || sc.duration <= 0) continue;

    const classUnits = sc.duration / 60;
    totalClasses += classUnits;

    const cls = await SecondaryClass.findByPk(sc.class_id, {
      attributes: ["classnumber"],
    });
    if (!cls) continue;

    const classNumber = Number(cls.classnumber);
    if (Number.isNaN(classNumber)) continue;

    const classRange = await ClassRange.findOne({
      where: {
        fromClass: { [Op.lte]: classNumber },
        toClass: { [Op.gte]: classNumber },
        isDeleted: false,
      },
    });
    if (!classRange) continue;

    const basePayRow = await BasePay.findOne({
      where: {
        classRangeId: classRange.id,
        isDeleted: false,
      },
    });
    if (!basePayRow) continue;

    const amount = basePayRow.basePay * classUnits;
    totalBasePay += amount;

    console.log(
      `✔ Class ${classNumber} | ${sc.duration} min | Base: ${basePayRow.basePay} | Amount: ${amount}`
    );
  }

  /* --------------------------
     ATTENDANCE
     (Schedule ID, not class_id)
  --------------------------- */
  const attendedClasses = await Attendance.count({
    where: {
      class_id: { [Op.in]: schedules.map(s => s.id) },
      isattendanceconfirmed: 1,
      user_id: tutor.id,
    },
  });

  const missedClasses = schedules.length - attendedClasses;

  /* --------------------------
     PAY RULE CALCULATION
  --------------------------- */
  let incrementAmount = 0;
  let deductionAmount = 0;

  const threshold = rule.monthly_threshold;

  if (missedClasses > 0) {
    const perClassDeduction =
      totalClasses >= threshold
        ? rule.above_threshold.decrement
        : rule.below_threshold.decrement;

    deductionAmount = missedClasses * perClassDeduction;

    console.log(
      `❌ Missed: ${missedClasses} | Per Class Deduction: ${perClassDeduction} | Total: ${deductionAmount}`
    );
  } else {
    if (totalClasses >= threshold) {
      for (const r of rule.above_threshold.rules) {
        const inc = (totalBasePay * r.increment) / 100;
        incrementAmount += inc;

        console.log(
          `➕ Above Threshold +${r.increment}% = ${inc}`
        );
      }
    } else {
      incrementAmount =
        attendedClasses * rule.below_threshold.increment;

      console.log(
        `➕ Below Threshold | Classes: ${attendedClasses} | Amount: ${incrementAmount}`
      );
    }
  }

  /* --------------------------
     FINAL SUMMARY
  --------------------------- */
  const grossSalary = totalBasePay + incrementAmount;
  const netSalary = grossSalary - deductionAmount;

  console.log("\n================ SUMMARY ================");
  console.log(`Total Class Units : ${totalClasses}`);
  console.log(`Total Schedules   : ${schedules.length}`);
  console.log(`Attended Classes  : ${attendedClasses}`);
  console.log(`Missed Classes    : ${missedClasses}`);
  console.log(`Base Salary       : ${totalBasePay}`);
  console.log(`Increments        : ${incrementAmount}`);
  console.log(`Deductions        : ${deductionAmount}`);
  console.log(`Gross Salary      : ${grossSalary}`);
  console.log(`✅ Net Salary     : ${netSalary}`);
  console.log("========================================\n");
}

/* ==========================
   RUN
========================== */
verifyTutorSalary()
  .then(() => console.log("✅ Verification completed"))
  .catch(err => console.error("❌ Error:", err));
