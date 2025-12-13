const TutorSalary = require("../../models/primary/TutorSalary");
const TutorPayroll = require("../../models/primary/TutorPayroll");
const SecondaryUser = require("../../models/secondary/User");
const ClassSchedule = require("../../models/secondary/ClassSchedule");
const SecondaryClass = require("../../models/secondary/Class");

const Attendance = require("../../models/secondary/Attndance"); // ← ADD
const TutorPayRule = require("../../models/primary/TutorPayRule"); // ← ADD

const ClassRange = require("../../models/primary/ClassRange");
const BasePay = require("../../models/primary/BasePay");
const { Op } = require("sequelize");

function getSalaryDatesFromPayrollMonth(payrollMonth) {
  const d = new Date(payrollMonth);
  return {
    salaryDate: new Date(d.getFullYear(), d.getMonth(), 8),
    dueDate: new Date(d.getFullYear(), d.getMonth(), 9),
    finalDueDate: new Date(d.getFullYear(), d.getMonth(), 10),
  };
}

async function generateTutorSalary() {
  console.log("🔄 Tutor Salary cron started");

  const payrollMonth = "2025-09-01";
  const d = new Date(payrollMonth);

  const startDate = new Date(d.getFullYear(), d.getMonth(), 1);
  const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0);

  console.log("📅 Payroll period:", startDate, " → ", endDate);

  // Load payrule for tutor
  const payRule = await TutorPayRule.findOne({ where: { isDeleted: false } });

  const rule = payRule?.config || {}; // ensure JSON

  // 1️⃣ Fetch tutors
  const tutors = await SecondaryUser.findAll({
    where: { role: 3, id: 122 },
    attributes: ["id", "name"],
  });

  for (const tutor of tutors) {
    const tutorId = tutor.id;

    // 2️⃣ Salary / Payroll checking
    const existingPayroll = await TutorPayroll.findOne({
      where: { tutorId, payrollMonth, isDeleted: false },
    });
    if (existingPayroll) continue;

    const existingSalary = await TutorSalary.findOne({
      where: { tutorId, payrollMonth, type: "TUTOR" },
    });
    if (existingSalary) continue;

    // 3️⃣ Fetch schedules for the month
    const schedules = await ClassSchedule.findAll({
      where: {
        tutor: tutorId,
        status: 2,
        [Op.or]: [
          { start: { [Op.between]: [startDate, endDate] } },
          { end: { [Op.between]: [startDate, endDate] } },
        ],
      },
      attributes: ["id", "class_id", "start", "end"],
    });

    if (!schedules.length) continue;

    let totalBasePay = 0;

    // 4️⃣ Calculate basepay per class
    for (const sc of schedules) {
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

      totalBasePay += basePayRow.basePay;
    }

    // 5️⃣ ATTENDANCE CHECK
    const attendedClasses = await Attendance.count({
      where: {
        class_id: { [Op.in]: schedules.map((s) => s.id) },
        isattendanceconfirmed: 1,
        user_id: tutorId,
      },
    });

    const totalClasses = schedules.length;
    const missedClasses = totalClasses - attendedClasses;

    console.log(
      `Tutor ${tutorId}: Total=${totalClasses}, Attended=${attendedClasses}, Missed=${missedClasses}`
    );

    // 6️⃣ APPLY PAY RULES
    const threshold = rule.monthly_threshold;
    let finalSalary = totalBasePay;
    console.log(rule);

    if (totalClasses >= threshold) {
      console.log("Using ABOVE THRESHOLD rules");

      // apply increments (rules array)
      for (const r of rule.above_threshold.rules) {
        finalSalary += (totalBasePay * r.increment) / 100;
      }

      // apply decrement for missed classes
      finalSalary -= missedClasses * rule.above_threshold.decrement;
    } else {
      console.log("Using BELOW THRESHOLD rules");

      // increment per attended class
      finalSalary += attendedClasses * rule.below_threshold.increment;

      // decrement per missed class
      finalSalary -= missedClasses * rule.below_threshold.decrement;
    }

    console.log(`Tutor ${tutorId} → FINAL SALARY = ${finalSalary}`);

    const { salaryDate, dueDate, finalDueDate } =
      getSalaryDatesFromPayrollMonth(payrollMonth);

    console.log(`✅ Salary generated for tutor ${tutorId}`);
  }

  console.log("🎉 Tutor salary calculation completed");
}

generateTutorSalary();
