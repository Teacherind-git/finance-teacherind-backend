require("dotenv").config({
  path: "/home/trivand/Thanseem/Payroll System/payroll-backend/.env",
  quiet: true,
});

const moment = require("moment");
const { Op } = require("sequelize");

const sequelize = require("../../config/database");

const Student = require("../../models/primary/Student");
const StudentDetail = require("../../models/primary/StudentDetail");
const StudentBill = require("../../models/primary/StudentBill");
const PrimaryUser = require("../../models/primary/User");

const cronLogger = require("../cronLogger");

// -----------------------------------------------------------------------------
// LOGGER
// -----------------------------------------------------------------------------

const log = {
  info: (msg, meta = {}) => cronLogger.info(msg, meta),
  warn: (msg, meta = {}) => cronLogger.warn(msg, meta),
  error: (msg, meta = {}) => cronLogger.error(msg, meta),
};

// -----------------------------------------------------------------------------
// GET ADMIN USER
// -----------------------------------------------------------------------------

async function getAdminUser() {
  const adminUser = await PrimaryUser.findOne({
    where: {
      roleId: 1,
      isDeleted: false,
    },
    attributes: ["id"],
  });

  if (!adminUser) {
    throw new Error("Admin user (roleId = 1) not found");
  }

  return adminUser;
}

// -----------------------------------------------------------------------------
// GENERATE SAFE INVOICE ID
// -----------------------------------------------------------------------------

async function generateInvoiceId(transaction) {
  const year = moment().format("YYYY");
  const month = moment().format("MM");

  const prefix = `INV-${year}-${month}`;

  /**
   * IMPORTANT:
   * Transaction + LOCK prevents duplicate invoice IDs
   * when multiple cron instances run simultaneously
   */

  const lastBill = await StudentBill.findOne({
    where: {
      invoiceId: {
        [Op.like]: `${prefix}-%`,
      },
    },
    order: [["createdAt", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  let nextNumber = 1;

  if (lastBill?.invoiceId) {
    const parts = lastBill.invoiceId.split("-");
    const lastNumber = parseInt(parts[3], 10);

    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  const padded = String(nextNumber).padStart(3, "0");

  return `${prefix}-${padded}`;
}

// -----------------------------------------------------------------------------
// MAIN BILL GENERATOR
// -----------------------------------------------------------------------------

async function generateBills() {
  log.info("🧾 Student billing cron started", {
    date: moment().format("YYYY-MM-DD HH:mm:ss"),
  });

  try {
    const adminUser = await getAdminUser();

    log.info("🛠 Cron executed by Admin", {
      adminId: adminUser.id,
    });

    // -------------------------------------------------------------------------
    // FETCH STUDENTS
    // -------------------------------------------------------------------------

    const students = await Student.findAll({
      include: [
        {
          model: StudentDetail,
          as: "details",
          required: true,
        },
      ],
    });

    log.info("Students fetched", {
      totalStudents: students.length,
    });

    // -------------------------------------------------------------------------
    // PROCESS EACH STUDENT
    // -------------------------------------------------------------------------

    for (const student of students) {
      const transaction = await sequelize.transaction();

      try {
        // ---------------------------------------------------------------------
        // CHECK EXISTING ACTIVE BILL
        // ---------------------------------------------------------------------

        /**
         * IMPORTANT:
         * Prevent duplicate bills
         *
         * Only allow ONE active unpaid/generated bill per student
         */

        const existingBill = await StudentBill.findOne({
          where: {
            studentId: student.id,
            status: {
              [Op.in]: ["Generated", "Pending", "Unpaid"],
            },
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (existingBill) {
          log.warn("Skipping — active bill already exists", {
            studentId: student.id,
            existingBillId: existingBill.id,
            invoiceId: existingBill.invoiceId,
          });

          await transaction.commit();
          continue;
        }

        // ---------------------------------------------------------------------
        // CALCULATE TOTAL AMOUNT
        // ---------------------------------------------------------------------

        let totalAmount = 0;
        let earliestStartDate = null;

        for (const detail of student.details) {
          const price =
            Number(detail.totalPrice || detail.packagePrice || 0);

          totalAmount += price;

          if (
            detail.startDate &&
            (!earliestStartDate ||
              moment(detail.startDate).isBefore(earliestStartDate))
          ) {
            earliestStartDate = detail.startDate;
          }
        }

        // ---------------------------------------------------------------------
        // SKIP ZERO AMOUNT
        // ---------------------------------------------------------------------

        if (totalAmount <= 0) {
          log.warn("Skipping — amount is zero", {
            studentId: student.id,
          });

          await transaction.commit();
          continue;
        }

        // ---------------------------------------------------------------------
        // GENERATE INVOICE ID
        // ---------------------------------------------------------------------

        const invoiceId = await generateInvoiceId(transaction);

        // ---------------------------------------------------------------------
        // DATES
        // ---------------------------------------------------------------------

        const billDate = moment().toDate();

        const dueDate = earliestStartDate
          ? moment(earliestStartDate).toDate()
          : moment().toDate();

        const finalDueDate = earliestStartDate
          ? moment(earliestStartDate)
              .add(
                parseInt(process.env.FINAL_DUE_MINUTES || "60", 10),
                "minutes"
              )
              .toDate()
          : moment()
              .add(
                parseInt(process.env.FINAL_DUE_MINUTES || "60", 10),
                "minutes"
              )
              .toDate();

        // ---------------------------------------------------------------------
        // CREATE BILL
        // ---------------------------------------------------------------------

        const createdBill = await StudentBill.create(
          {
            invoiceId,
            studentId: student.id,
            amount: totalAmount,
            billDate,
            dueDate,
            finalDueDate,
            status: "Generated",
            createdBy: adminUser.id,
            updatedBy: adminUser.id,
          },
          { transaction }
        );

        // ---------------------------------------------------------------------
        // COMMIT
        // ---------------------------------------------------------------------

        await transaction.commit();

        log.info("✅ Bill generated successfully", {
          billId: createdBill.id,
          invoiceId,
          studentId: student.id,
          amount: totalAmount,
        });
      } catch (studentError) {
        await transaction.rollback();

        log.error("❌ Failed to generate bill for student", {
          studentId: student.id,
          message: studentError.message,
          stack: studentError.stack,
        });
      }
    }

    // -------------------------------------------------------------------------
    // COMPLETED
    // -------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// START
// -----------------------------------------------------------------------------

generateBills();