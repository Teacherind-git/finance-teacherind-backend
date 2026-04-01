const moment = require("moment");
const { Op } = require("sequelize");
const StudentBill = require("../../models/primary/StudentBill");
const logger = require("../logger");

/* ==========================
   CLEAN LOGGER WRAPPER
========================== */
const log = {
  info: (msg, meta = {}) => logger.info(msg, meta),
  warn: (msg, meta = {}) => logger.warn(msg, meta),
  error: (msg, meta = {}) => logger.error(msg, meta),
};

/* ==========================
   MAIN CRON FUNCTION
========================== */
async function updateBillStatuses() {
  const now = moment().toDate();

  log.info("🔄 Student Bill Status Update Cron Started");

  try {
    /* --------------------------
       Generated → Due
    --------------------------- */
    const [dueUpdated] = await StudentBill.update(
      { status: "Due" },
      {
        where: {
          status: "Generated",
          dueDate: { [Op.lte]: now },
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
          finalDueDate: { [Op.lte]: now },
          isDeleted: false,
        },
      }
    );

    log.info("✔️ Student Bill Status Update Completed", {
      generatedToDue: dueUpdated,
      dueToOverdue: overdueUpdated,
    });

    process.exit(0);
  } catch (error) {
    log.error("❌ Student Bill Status Update Failed", {
      message: error.message,
    });

    process.exit(1);
  }
}

/* ==========================
   RUN CRON
========================== */

updateBillStatuses();