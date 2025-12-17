require("dotenv").config({
  path: "/home/trivand/Thanseem/Payroll System/payroll-backend/.env",
  quiet: true,
});

const moment = require("moment");
const { Op } = require("sequelize");

// Models
const Student = require("../../models/primary/Student");
const StudentDetail = require("../../models/primary/StudentDetail");
const StudentBill = require("../../models/primary/StudentBill");
const PrimaryUser = require("../../models/primary/User");

// Logger
const logger = require("../logger");

/* ==========================
   CRON-FRIENDLY LOGGER
========================== */
const logBoth = {
  info: (msg, meta = {}) => logger.info(msg, meta),
  warn: (msg, meta = {}) => logger.warn(msg, meta),
  error: (msg, meta = {}) => logger.error(msg, meta),
};

/* ==========================
   HELPERS
========================== */

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

async function generateInvoiceId(transaction = null) {
  const year = moment().format("YYYY");
  const month = moment().format("MM");

  const prefix = `INV-${year}-${month}`;

  const lastBill = await StudentBill.findOne({
    where: {
      invoiceId: {
        [Op.like]: `${prefix}-%`,
      },
    },
    order: [["createdAt", "DESC"]],
    transaction,
  });

  let nextNumber = 1;

  if (lastBill?.invoiceId) {
    const parts = lastBill.invoiceId.split("-");
    nextNumber = parseInt(parts[3], 10) + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}

/* ==========================
   MAIN CRON
========================== */
async function generateBills() {
  const startOfToday = moment().startOf("day");
  const endOfToday = moment().endOf("day");

  logBoth.info("📄 Student billing job started", {
    date: startOfToday.format("YYYY-MM-DD"),
  });

  try {
    /* --------------------------
       ADMIN USER
    --------------------------- */
    const adminUser = await getAdminUser();
    logBoth.info("🛠️ Billing executed by Admin", {
      adminUserId: adminUser.id,
    });

    /* --------------------------
       FETCH STUDENTS
    --------------------------- */
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

    logBoth.info("Students fetched for billing", {
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
        logBoth.warn("Billing skipped – already billed today", {
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
        logBoth.warn("Billing skipped – amount is zero", {
          studentId: student.id,
        });
        continue;
      }

      const invoiceId = await generateInvoiceId();

      await StudentBill.create({
        invoiceId,
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
        createdBy: adminUser.id,   // ✅ dynamic
        updatedBy: adminUser.id,   // ✅ dynamic
      });

      logBoth.info("✅ Bill generated successfully", {
        studentId: student.id,
        invoiceId,
        amount: totalAmount,
      });
    }

    logBoth.info("🎉 Student billing job completed successfully");
    process.exit(0);
  } catch (error) {
    logBoth.error("❌ Student billing job failed", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

generateBills();
