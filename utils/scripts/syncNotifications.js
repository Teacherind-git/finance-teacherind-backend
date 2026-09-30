const { sequelizePrimary, sequelizeSecondary } = require("../../config/db");
const Notification = require("../../models/primary/Notification");
const createPlanExpiryNotifications = require("../cronScripts/createPlanExpiryNotifications");
const logger = require("../../utils/logger");

(async () => {
  try {
    await sequelizePrimary.authenticate();
    await sequelizeSecondary.authenticate();
    logger.info("✅ Database connection established.");

    // Only touches the notifications table
    await Notification.sync({ alter: true });
    logger.info("✅ notifications table created or updated successfully.");

    await createPlanExpiryNotifications();
    logger.info("✅ Plan expiry notifications generated.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error syncing notifications:", {
      message: error.message,
      sqlMessage: error.parent?.sqlMessage,
      stack: error.stack,
    });
    process.exit(1);
  }
})();
