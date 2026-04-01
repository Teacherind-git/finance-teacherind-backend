require("dotenv").config({
  path: "/home/trivand/Thanseem/Payroll System/payroll-backend/.env",
  quiet: true,
});

const moment = require("moment");
const { Op } = require("sequelize");

const Student = require("../../models/primary/Student");
const StudentDetail = require("../../models/primary/StudentDetail");
const StudentBill = require("../../models/primary/StudentBill");
const PrimaryUser = require("../../models/primary/User");

const cronLogger = require("../cronLogger");

// Clean helper (NO console logs)
const log = {
  info: (msg, meta = {}) => cronLogger.info(msg, meta),
  warn: (msg, meta = {}) => cronLogger.warn(msg, meta),
  error: (msg, meta = {}) => cronLogger.error(msg, meta),
};

// Fetch Admin user
async function getAdminUser() {
  const adminUser = await PrimaryUser.findOne({
    where: { roleId: 1, isDeleted: false },
    attributes: ["id"],
  });

  if (!adminUser) {
    throw new Error("❌ Admin user (roleId = 1) not found");
  }

  return adminUser;
}

// Generate Invoice ID
async function generateInvoiceId(transaction = null) {
  const year = moment().format("YYYY");
  const month = moment().format("MM");

  const prefix = `INV-${year}-${month}`;

  const lastBill = await StudentBill.findOne({
    where: {
      invoiceId: { [Op.like]: `${prefix}-%` },
    },
    order: [["createdAt", "DESC"]],
    transaction,
  });

  let nextNumber = 1;

  if (lastBill?.invoiceId) {
    const parts = lastBill.invoiceId.split("-");
    const lastNumber = parseInt(parts[3], 10);
    nextNumber = lastNumber + 1;
  }

  const padded = String(nextNumber).padStart(3, "0");
  return `${prefix}-${padded}`;
}

// MAIN FUNCTION
async function generateBills() {
  const startOfToday = moment().startOf("day");
  const endOfToday = moment().endOf("day");

  log.info("🧾 Student billing cron started", {
    date: startOfToday.format("YYYY-MM-DD"),
  });

  try {
    const adminUser = await getAdminUser();
    log.info("🛠 Cron executed by Admin", { adminId: adminUser.id });

    const students = await Student.findAll({
      include: [
        { model: StudentDetail, as: "details", required: true },
        {
          model: StudentBill,
          as: "bills",
          required: false,
        },
      ],
    });

    log.info("Students fetched", { totalStudents: students.length });

    for (const student of students) {
      // Skip if already billed today
      const existingBill = await StudentBill.findOne({
        where: {
          studentId: student.id,
          billDate: {
            [Op.between]: [startOfToday.toDate(), endOfToday.toDate()],
          },
        },
      });

      if (existingBill) {
        log.warn("Skipping — already billed today", { studentId: student.id });
        continue;
      }

      // Total Amount
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
        log.warn("Skipping — amount is zero", { studentId: student.id });
        continue;
      }

      const invoiceId = await generateInvoiceId();

      await StudentBill.create({
        invoiceId,
        studentId: student.id,
        amount: totalAmount,
        billDate: moment().toDate(),
        dueDate: earliestStartDate || moment().toDate(),
        finalDueDate: earliestStartDate
          ? moment(earliestStartDate)
              .add(parseInt(process.env.FINAL_DUE_MINUTES || "60"), "minutes")
              .toDate()
          : moment()
              .add(parseInt(process.env.FINAL_DUE_MINUTES || "60"), "minutes")
              .toDate(),
        status: "Generated",
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      });

      log.info("Bill generated", {
        studentId: student.id,
        amount: totalAmount,
        invoiceId,
      });
    }

    log.info("🎉 Billing cron completed successfully");
    process.exit(0);
  } catch (error) {
    log.error("❌ Billing cron failed", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

generateBills();
