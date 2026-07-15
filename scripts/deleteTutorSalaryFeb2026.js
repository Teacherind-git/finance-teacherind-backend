/**
 * Deletes all tutor_salary rows (and their tutor_salary_breakdown children)
 * where payrollMonth falls in February 2026.
 *
 * Usage:
 *   node scripts/deleteTutorSalaryFeb2026.js            # dry run (counts only, no deletion)
 *   node scripts/deleteTutorSalaryFeb2026.js --confirm   # actually deletes
 */

const { Op } = require("sequelize");
const { sequelizePrimary } = require("../config/db");
const TutorSalary = require("../models/primary/TutorSalary");
const TutorSalaryBreakdown = require("../models/primary/TutorSalaryBreakdown");

const RANGE_START = new Date("2026-02-01T00:00:00.000Z");
const RANGE_END = new Date("2026-03-01T00:00:00.000Z"); // exclusive

async function run() {
  const isConfirmed = process.argv.includes("--confirm");

  await sequelizePrimary.authenticate();

  const salaryRows = await TutorSalary.findAll({
    where: {
      payrollMonth: { [Op.gte]: RANGE_START, [Op.lt]: RANGE_END },
    },
    attributes: ["id"],
    raw: true,
  });
  const salaryIds = salaryRows.map((row) => row.id);

  const breakdownCount = salaryIds.length
    ? await TutorSalaryBreakdown.count({ where: { salaryId: { [Op.in]: salaryIds } } })
    : 0;

  console.log(`Found ${salaryIds.length} tutor_salary row(s) for February 2026.`);
  console.log(`Found ${breakdownCount} related tutor_salary_breakdown row(s).`);

  if (!salaryIds.length) {
    console.log("Nothing to delete.");
    await sequelizePrimary.close();
    return;
  }

  if (!isConfirmed) {
    console.log("\nDry run only — no rows deleted. Re-run with --confirm to delete these rows.");
    await sequelizePrimary.close();
    return;
  }

  const transaction = await sequelizePrimary.transaction();
  try {
    const deletedBreakdowns = await TutorSalaryBreakdown.destroy({
      where: { salaryId: { [Op.in]: salaryIds } },
      transaction,
    });

    const deletedSalaries = await TutorSalary.destroy({
      where: { id: { [Op.in]: salaryIds } },
      transaction,
    });

    await transaction.commit();
    console.log(`Deleted ${deletedBreakdowns} tutor_salary_breakdown row(s).`);
    console.log(`Deleted ${deletedSalaries} tutor_salary row(s).`);
  } catch (error) {
    await transaction.rollback();
    console.error("Deletion failed, transaction rolled back:", error.message);
    throw error;
  } finally {
    await sequelizePrimary.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
