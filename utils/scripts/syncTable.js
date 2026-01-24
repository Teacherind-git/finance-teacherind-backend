const { sequelizePrimary } = require("../../config/db");
const Expense = require("../../models/primary/PayrollAudit"); // renamed for clarity
const logger = require("../../utils/logger"); // optional centralized logger

(async () => {
  try {
    await sequelizePrimary.authenticate();
    logger.info("✅ Database connection established.");

    // Create or update table based on model
    await Expense.sync({ alter: true });
    logger.info("✅ Expense table created or updated successfully.");

    process.exit(0);
  } catch (error) {
    logger.error("❌ Error creating/updating Expense table:", { message: error.message, stack: error.stack });
    process.exit(1);
  }
})();
