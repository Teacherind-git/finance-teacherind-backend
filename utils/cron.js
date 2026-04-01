const cron = require("node-cron");
const logger = require("./logger");

// Helper for timestamp
const getTime = () => new Date().toLocaleString("en-IN", {
  timeZone: "Asia/Kolkata",
});

// Import scripts
const generateBills = require("./cronScripts/generateBills");
const updateBillStatus = require("./cronScripts/updateBillStatus");

const generateStaffSalary = require("./cronScripts/generateStaffSalary");
const updateStaffSalary = require("./cronScripts/updateStaffSalary");

const generateTutorSalary = require("./cronScripts/generateTutorSalary");
const updateTutorSalary = require("./cronScripts/updateTutorSalary");

/**
 * 🕛 DAILY - Bills (Midnight)
 */
cron.schedule("0 0 * * *", async () => {
  const time = getTime();
  try {
    logger.info(`🧾 [${time}] Running daily bill cron...`);
    await generateBills();
    await updateBillStatus();
    logger.info(`✅ [${time}] Bill cron completed`);
  } catch (err) {
    logger.error(`❌ [${time}] Bill cron failed`, err);
  }
}, { timezone: "Asia/Kolkata" });

/**
 * 📅 8th - Generate Salaries
 */
cron.schedule("0 0 8 * *", async () => {
  const time = getTime();
  try {
    logger.info(`💰 [${time}] Generating salaries...`);
    await generateStaffSalary();
    await generateTutorSalary();
    logger.info(`✅ [${time}] Salary generation done`);
  } catch (err) {
    logger.error(`❌ [${time}] Salary generation failed`, err);
  }
}, { timezone: "Asia/Kolkata" });

/**
 * 📅 9th - Update Salaries
 */
cron.schedule("0 0 9 * *", async () => {
  const time = getTime();
  try {
    logger.info(`🔄 [${time}] Updating salaries (9th)...`);
    await updateStaffSalary();
    await updateTutorSalary();
  } catch (err) {
    logger.error(`❌ [${time}] Salary update failed`, err);
  }
}, { timezone: "Asia/Kolkata" });

/**
 * 📅 10th - Update Salaries again
 */
cron.schedule("0 0 10 * *", async () => {
  const time = getTime();
  try {
    logger.info(`🔄 [${time}] Updating salaries (10th)...`);
    await updateStaffSalary();
    await updateTutorSalary();
  } catch (err) {
    logger.error(`❌ [${time}] Salary update failed`, err);
  }
}, { timezone: "Asia/Kolkata" });