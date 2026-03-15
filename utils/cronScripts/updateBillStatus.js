const moment = require("moment");
const { Op } = require("sequelize");

const StudentBill = require("../../models/primary/StudentBill");
const logger = require("../logger");

/* ==========================
   LOGGER
========================== */
const logBoth = {
  info: (msg, meta = {}) => logger.info(msg, meta),
  warn: (msg, meta = {}) => logger.warn(msg, meta),
  error: (msg, meta = {}) => logger.error(msg, meta),
};

/* ==========================
   UPDATE BILL STATUS
========================== */
async function updateBillStatuses() {
  const now = moment().toDate();

  logBoth.info("Student bill status update started", {
    time: moment().format("YYYY-MM-DD HH:mm:ss"),
  });

  try {
    /* --------------------------
       Generated → Due
    --------------------------- */
    const [dueUpdated] = await StudentBill.update(
      { status: "Due" },
      {
        where: {
          status: "Generated",
          dueDate: {
            [Op.lte]: now,
          },
          isDeleted: false,
        },
      }
    );

    /* --------------------------
       Due → Overdue
    --------------------------- */
    const [overdueUpdated] = await StudentBill.update(
      { status: "Overdue" },
      {
        where: {
          status: "Due",
          finalDueDate: {
            [Op.lte]: now,
          },
          isDeleted: false,
        },
      }
    );

    logBoth.info("Student bill status update completed", {
      dueUpdated,
      overdueUpdated,
    });

    process.exit(0);
  } catch (error) {
    logBoth.error("Student bill status update failed", {
      message: error.message,
      stack: error.stack,
    });

    process.exit(1);
  }
}

/* ==========================
   RUN CRON
========================== */

updateBillStatuses();