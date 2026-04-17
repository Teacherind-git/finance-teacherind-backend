const cron = require("node-cron");
const logger = require("./cronLogger");

// Timestamp helper
const getTime = () =>
  new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

// Delay helper
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * ✅ Safe runner with:
 * - try/catch
 * - timeout protection
 * - logging
 */
const safeRun = async (fn, name, timeoutMs = 60000) => {
  const time = getTime();

  try {
    logger.info(`➡️ [${time}] Starting ${name}`);

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${name} timeout`)), timeoutMs)
    );

    await Promise.race([fn(), timeout]);

    logger.info(`✅ [${time}] Completed ${name}`);
  } catch (err) {
    logger.error(`❌ [${time}] Error in ${name}: ${err.message}`);
  }
};

cron.schedule("0 * * * *", () => {
  console.log("🔥 Cron is working:", new Date().toLocaleString());
});

/**
 * 🕛 DAILY - Bills (Midnight)
 */
cron.schedule(
  "0 0 * * *",
  async () => {
    const time = getTime();

    try {
      logger.info(`🧾 [${time}] Running daily bill cron...`);

      // Lazy load (prevents startup crash)
      const generateBills = require("./cronScripts/generateBills");
      const updateBillStatus = require("./cronScripts/updateBillStatus");

      await safeRun(generateBills, "generateBills");
      await delay(3000); // prevent DB overload
      await safeRun(updateBillStatus, "updateBillStatus");

      logger.info(`✅ [${time}] Bill cron completed`);
    } catch (err) {
      logger.error(`❌ [${time}] Bill cron failed`, err);
    }
  },
  { timezone: "Asia/Kolkata" }
);

/**
 * 📅 7th - Generate Salaries
 */
cron.schedule(
  "0 0 7 * *",
  async () => {
    const time = getTime();

    try {
      logger.info(`💰 [${time}] Generating salaries...`);

      const generateStaffSalary = require("./cronScripts/generateStaffSalary");
      const generateTutorSalary = require("./cronScripts/generateTutorSalary");

      await safeRun(generateStaffSalary, "generateStaffSalary");
      await delay(3000);
      await safeRun(generateTutorSalary, "generateTutorSalary");

      logger.info(`✅ [${time}] Salary generation done`);
    } catch (err) {
      logger.error(`❌ [${time}] Salary generation failed`, err);
    }
  },
  { timezone: "Asia/Kolkata" }
);

/**
 * 📅 8th - Update Salaries
 */
cron.schedule(
  "0 0 8 * *",
  async () => {
    const time = getTime();

    try {
      logger.info(`🔄 [${time}] Updating salaries (9th)...`);

      const updateStaffSalary = require("./cronScripts/updateStaffSalary");
      const updateTutorSalary = require("./cronScripts/updateTutorSalary");

      await safeRun(updateStaffSalary, "updateStaffSalary");
      await delay(3000);
      await safeRun(updateTutorSalary, "updateTutorSalary");
    } catch (err) {
      logger.error(`❌ [${time}] Salary update failed`, err);
    }
  },
  { timezone: "Asia/Kolkata" }
);

/**
 * 📅 9th - Update Salaries again
 */
cron.schedule(
  "0 0 9 * *",
  async () => {
    const time = getTime();

    try {
      logger.info(`🔄 [${time}] Updating salaries (10th)...`);

      const updateStaffSalary = require("./cronScripts/updateStaffSalary");
      const updateTutorSalary = require("./cronScripts/updateTutorSalary");

      await safeRun(updateStaffSalary, "updateStaffSalary");
      await delay(3000);
      await safeRun(updateTutorSalary, "updateTutorSalary");
    } catch (err) {
      logger.error(`❌ [${time}] Salary update failed`, err);
    }
  },
  { timezone: "Asia/Kolkata" }
);

/**
 * 🛑 Global crash protection (VERY IMPORTANT)
 */
process.on("uncaughtException", (err) => {
  logger.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  logger.error("❌ Unhandled Rejection:", err);
});