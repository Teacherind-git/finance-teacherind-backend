require("dotenv").config({
  path: "/home/trivand/Thanseem/Payroll System/payroll-backend/.env",
});
const moment = require("moment");
const { Op } = require("sequelize");

const Student = require("../../models/primary/Student");
const StudentDetail = require("../../models/primary/StudentDetail");
const StudentBill = require("../../models/primary/StudentBill");

async function generateBills() {
  const startOfToday = moment().startOf("day");
  const endOfToday = moment().endOf("day");

  // ✅ ONLY students created today
  const students = await Student.findAll({
    where: {
      createdAt: {
        [Op.between]: [startOfToday.toDate(), endOfToday.toDate()],
      },
    },
    include: [
      {
        model: StudentDetail,
        as: "details",
        required: true,
      },
    ],
  });

  for (const student of students) {
    // ✅ CHECK: Already billed today?
    const existingBill = await StudentBill.findOne({
      where: {
        studentId: student.id,
        billDate: {
          [Op.between]: [
            startOfToday.toDate(),
            endOfToday.toDate(),
          ],
        },
      },
    });

    if (existingBill) {
      console.log(`⏭ Skipped student ${student.id} (already billed today)`);
      continue;
    }

    let totalAmount = 0;
    let earliestStartDate = null;

    for (const detail of student.details) {
      const price = detail.totalPrice || detail.packagePrice || 0;
      totalAmount += price;

      if (
        detail.startDate &&
        (!earliestStartDate ||
          moment(detail.startDate).isBefore(earliestStartDate))
      ) {
        earliestStartDate = detail.startDate;
      }
    }

    if (totalAmount <= 0) continue;

    await StudentBill.create({
      studentId: student.id,
      amount: totalAmount,
      billDate: moment().toDate(),
      dueDate: earliestStartDate
        ? moment(earliestStartDate).toDate()
        : moment().toDate(),
      finalDueDate: earliestStartDate
        ? moment(earliestStartDate)
            .add(
              parseInt(process.env.FINAL_DUE_MINUTES || "60"),
              "minutes"
            )
            .toDate()
        : moment()
            .add(
              parseInt(process.env.FINAL_DUE_MINUTES || "60"),
              "minutes"
            )
            .toDate(),
      status: "Generated",
      createdBy: 10,
      updatedBy: 10,
    });

    console.log(`✅ Bill generated for student ${student.id}`);
  }

  console.log("✔ Today billing job completed.");
  process.exit(0);
}

generateBills();
