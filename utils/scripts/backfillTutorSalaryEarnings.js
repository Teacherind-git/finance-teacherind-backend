// One-off backfill: copy earnings/deductions/totalEarnings/totalDeductions
// from each tutor_salary row's linked tutor_payrolls row onto the salary
// row itself, now that those fields are snapshotted on tutor_salary going
// forward (see models/primary/TutorSalary.js). Only touches rows that don't
// already have a snapshot, so it's safe to re-run.
//
// NOTE: for any month whose payroll row was already shared/reused by
// another month (the pre-existing bug this migration fixes going forward),
// the backfilled value here is whatever that shared row currently holds —
// the true original figure for that specific month may already be lost.
const { sequelizePrimary } = require("../../config/db");
const TutorSalary = require("../../models/primary/TutorSalary");
const TutorPayroll = require("../../models/primary/TutorPayroll");
const logger = require("../logger");

(async () => {
  try {
    await sequelizePrimary.authenticate();
    logger.info("✅ Database connection established.");

    await TutorSalary.sync({ alter: true });
    logger.info("✅ tutor_salary table columns synced.");

    const salaries = await TutorSalary.findAll({
      where: { isDeleted: false },
      include: [{ model: TutorPayroll, as: "payroll" }],
    });

    let updated = 0;
    let skippedNoPayroll = 0;
    let skippedAlreadySnapshotted = 0;

    for (const salary of salaries) {
      const hasOwnSnapshot =
        (Array.isArray(salary.earnings) && salary.earnings.length > 0) ||
        (Array.isArray(salary.deductions) && salary.deductions.length > 0) ||
        !!salary.totalEarnings ||
        !!salary.totalDeductions;

      if (hasOwnSnapshot) {
        skippedAlreadySnapshotted += 1;
        continue;
      }

      if (!salary.payroll) {
        skippedNoPayroll += 1;
        continue;
      }

      await salary.update({
        earnings: salary.payroll.earnings || [],
        deductions: salary.payroll.deductions || [],
        totalEarnings: salary.payroll.totalEarnings || 0,
        totalDeductions: salary.payroll.totalDeductions || 0,
      });

      updated += 1;
    }

    logger.info("✅ Backfill complete.", {
      updated,
      skippedNoPayroll,
      skippedAlreadySnapshotted,
      total: salaries.length,
    });

    process.exit(0);
  } catch (error) {
    logger.error("❌ Backfill failed.", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
})();
