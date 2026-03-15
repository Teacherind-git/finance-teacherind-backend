const { sequelizePrimary } = require("../../config/db");
const Expense = require("../../models/primary/StudentBill"); // renamed for clarity
const TutorPayroll = require("../../models/primary/TutorPayroll");
const logger = require("../../utils/logger"); // optional centralized logger

(async () => {
  try {
    await sequelizePrimary.authenticate();
    logger.info("✅ Database connection established.");

    await Expense.sync({ alter: true });
    logger.info("✅ Expense table created or updated successfully.");

    // await sequelizePrimary.transaction(async (transaction) => {
    //   // Delete child rows first
    //   await Expense.destroy({ where: {}, force: true, transaction });

    //   // Then delete parent rows
    //   await TutorPayroll.destroy({ where: {}, force: true, transaction });
    // });

    //logger.info("✅ All TutorPayroll and TutorPayrollItem rows deleted successfully.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error deleting TutorPayroll/Items:", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
})();
