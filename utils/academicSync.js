const { QueryTypes } = require("sequelize");
const { sequelizeQuestionBank } = require("../config/db");
const Class = require("../models/primary/Class");
const Subject = require("../models/primary/Subject");
const Syllabus = require("../models/primary/Syllabus");
const logger = require("./logger");

// Syllabus / classes / subjects are maintained in the question bank DB.
// Other finance tables (fee structures, base pay, payroll items) reference
// the finance DB's own copies by id, so instead of reading from the question
// bank directly we copy new rows across, matched by firebase_id. Existing rows
// are never renamed or deleted: tutor salary generation matches syllabus by
// name, and rows may still be referenced.
const TABLES = [
  { model: Syllabus, table: "syllabus", field: "name" },
  { model: Class, table: "classes", field: "number" },
  { model: Subject, table: "subjects", field: "name" },
];

// Don't hit the question bank on every request
const MIN_INTERVAL_MS = 60 * 1000;
let lastSyncAt = 0;
let running = null;

async function syncTable({ model, table, field }) {
  const sourceRows = await sequelizeQuestionBank.query(
    `SELECT id, firebase_id, \`${field}\` AS value FROM \`${table}\``,
    { type: QueryTypes.SELECT },
  );

  const existing = await model.findAll({
    attributes: ["id", "firebase_id", field, "createdBy"],
  });
  const byFirebaseId = new Map(existing.map((r) => [r.firebase_id, r]));
  const usedIds = new Set(existing.map((r) => r.id));
  // createdBy is required; new rows get the same (finance DB) user as the
  // rows that were originally imported
  const createdBy = existing.find((r) => r.createdBy)?.createdBy ?? null;

  let added = 0;

  for (const row of sourceRows) {
    if (!row.firebase_id || row.value == null) continue;

    if (byFirebaseId.has(row.firebase_id)) continue;

    // Keep the question bank's id when it's free so both DBs stay aligned
    const created = await model.create({
      ...(usedIds.has(row.id) ? {} : { id: row.id }),
      firebase_id: row.firebase_id,
      [field]: row.value,
      createdBy,
      updatedBy: createdBy,
    });
    usedIds.add(created.id);
    added++;
  }

  if (added) {
    logger.info(`Synced ${table} from question bank: ${added} added`);
  }
}

// Fails soft: if the question bank is unreachable the finance DB's current
// copies are still served.
async function syncAcademicData({ force = false } = {}) {
  if (!sequelizeQuestionBank) return;
  if (!force && Date.now() - lastSyncAt < MIN_INTERVAL_MS) return;
  if (running) return running;

  running = (async () => {
    try {
      for (const t of TABLES) await syncTable(t);
      lastSyncAt = Date.now();
    } catch (error) {
      logger.warn("Question bank sync failed; using finance DB data", {
        message: error.message,
      });
    } finally {
      running = null;
    }
  })();

  return running;
}

module.exports = { syncAcademicData };
