require("dotenv").config({
  path: "/home/trivand/Thanseem/Payroll System/payroll-backend/.env",
});

const moment = require("moment");
const { Op } = require("sequelize");

const Student = require("../../models/primary/Student");
const StudentDetail = require("../../models/primary/StudentDetail");
const StudentBill = require("../../models/primary/StudentBill");

const logger = require("../logger"); // ✅ adjust path if needed

async function generateBills() {
  const startOfToday = moment().startOf("day");
  const endOfToday = moment().endOf("day");

  logger.info("Student billing job started", {
    date: startOfToday.format("YYYY-MM-DD"),
  });

  try {
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

    logger.info("Students fetched for billing", {
      count: students.length,
    });

    for (const student of students) {
      const existingBill = await StudentBill.findOne({
        where: {
          studentId: student.id,
          billDate: {
            [Op.between]: [startOfToday.toDate(), endOfToday.toDate()],
          },
        },
      });

      if (existingBill) {
        logger.warn("Billing skipped – already billed today", {
          studentId: student.id,
        });
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

      if (totalAmount <= 0) {
        logger.warn("Billing skipped – amount is zero", {
          studentId: student.id,
        });
        continue;
      }

      await StudentBill.create({
        studentId: student.id,
        amount: totalAmount,
        billDate: moment().toDate(),
        dueDate: earliestStartDate
          ? moment(earliestStartDate).toDate()
          : moment().toDate(),
        finalDueDate: earliestStartDate
          ? moment(earliestStartDate)
              .add(parseInt(process.env.FINAL_DUE_MINUTES || "60"), "minutes")
              .toDate()
          : moment()
              .add(parseInt(process.env.FINAL_DUE_MINUTES || "60"), "minutes")
              .toDate(),
        status: "Generated",
        createdBy: 10,
        updatedBy: 10,
      });

      logger.info("Bill generated successfully", {
        studentId: student.id,
        amount: totalAmount,
      });
    }

    logger.info("Student billing job completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Student billing job failed", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

generateBills();
