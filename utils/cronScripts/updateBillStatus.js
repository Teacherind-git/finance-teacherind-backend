require("dotenv").config({
  path: "/home/trivand/Thanseem/Payroll System/payroll-backend/.env",
});
const moment = require("moment");
const { Op } = require("sequelize");

const StudentBill = require("../../models/primary/StudentBill");
const logger = require("../../utils/logger"); // ✅ path as needed

async function updateBillStatus() {
  const today = moment().startOf("day");

  logger.info("Bill status update job started", {
    date: today.format("YYYY-MM-DD"),
  });

  try {
    // 🔶 Normal overdue → On Due
    const overdueBills = await StudentBill.findAll({
      where: {
        status: "Generated",
        dueDate: { [Op.lt]: today.toDate() },
      },
    });

    logger.info("Generated bills crossed dueDate", {
      count: overdueBills.length,
    });

    for (const bill of overdueBills) {
      bill.status = "On Due";
      await bill.save();

      logger.info("Bill moved to On Due", {
        billId: bill.id,
        studentId: bill.studentId,
      });
    }

    // 🔴 Final overdue → Overdue
    const finalOverdueBills = await StudentBill.findAll({
      where: {
        status: { [Op.ne]: "Paid" },
        finalDueDate: { [Op.lt]: today.toDate() },
      },
    });

    logger.info("Bills crossed finalDueDate", {
      count: finalOverdueBills.length,
    });

    for (const bill of finalOverdueBills) {
      bill.status = "Overdue";
      await bill.save();

      logger.warn("Bill marked as Overdue", {
        billId: bill.id,
        studentId: bill.studentId,
      });
    }

    logger.info("Bill status update job completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Bill status update job failed", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

updateBillStatus();
