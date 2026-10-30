// Adds the discount / edit columns to secondary_student_bills (safe to re-run)
// and backfills exam figures for existing bills from their breakdown JSON.
// Usage: node utils/scripts/addBillDiscountColumns.js
require("dotenv").config();
const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const logger = require("../logger");

const TABLE = "secondary_student_bills";

const columns = {
  grossAmount: { type: DataTypes.FLOAT, allowNull: true },
  subjectDiscount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  billDiscount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  totalDiscount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  examSessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  examAmount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  extraExams: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  extraExamAmount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  adjustmentNote: { type: DataTypes.STRING, allowNull: true },
  editedBy: { type: DataTypes.INTEGER, allowNull: true },
  editedAt: { type: DataTypes.DATE, allowNull: true },
};

(async () => {
  try {
    const qi = sequelizePrimary.getQueryInterface();
    const existing = await qi.describeTable(TABLE);

    for (const [name, definition] of Object.entries(columns)) {
      if (existing[name]) {
        logger.info(`⏭️ ${TABLE}.${name} already exists`);
        continue;
      }
      await qi.addColumn(TABLE, name, definition);
      logger.info(`🟢 Added ${TABLE}.${name}`);
    }

    // Backfill: gross = amount and exam figures from the generated breakdown
    const [, meta] = await sequelizePrimary.query(`
      UPDATE ${TABLE}
      SET grossAmount = amount,
          examSessions = COALESCE(JSON_EXTRACT(breakdown, '$.examFee.sessions'), 0),
          examAmount = COALESCE(JSON_EXTRACT(breakdown, '$.examFee.amount'), 0)
      WHERE grossAmount IS NULL
    `);
    logger.info(`✅ Backfilled ${meta?.affectedRows ?? 0} existing bill(s)`);

    await sequelizePrimary.close();
    process.exit(0);
  } catch (err) {
    logger.error("❌ Failed to add bill discount columns", {
      message: err.message,
      stack: err.stack,
    });
    await sequelizePrimary.close();
    process.exit(1);
  }
})();
