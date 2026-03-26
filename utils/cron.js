const cron = require("node-cron");

// Import your scripts
const generateBills = require("./utils/cronScripts/generateBills");
const updateBillStatus = require("./utils/cronScripts/updateBillStatus");

const generateStaffSalary = require("./utils/cronScripts/generateStaffSalary");
const updateStaffSalary = require("/utils/cronScripts/updateStaffSalary");

const generateTutorSalary = require("./utils/cronScripts/generateTutorSalary");
const updateTutorSalary = require("./utils/cronScripts/updateTutorSalary");

/**
 * 🕛 DAILY JOBS (Every midnight)
 * Runs at 00:00
 */
cron.schedule("0 0 * * *", async () => {
  console.log("Running daily bill jobs...");
  await generateBills();
  await updateBillStatus();
});

/**
 * 📅 MONTHLY JOBS
 */

// 8th → Generate staff & tutor salary
cron.schedule("0 0 8 * *", async () => {
  console.log("Generating salaries (8th)...");
  await generateStaffSalary();
  await generateTutorSalary();
});

// 9th → Update salaries
cron.schedule("0 0 9 * *", async () => {
  console.log("Updating salaries (9th)...");
  await updateStaffSalary();
  await updateTutorSalary();
});

// 10th → Update salaries again (if needed)
cron.schedule("0 0 10 * *", async () => {
  console.log("Updating salaries (10th)...");
  await updateStaffSalary();
  await updateTutorSalary();
});