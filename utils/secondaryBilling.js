const { Op } = require("sequelize");
const Package = require("../models/primary/Package");
const Subject = require("../models/primary/Subject");
const ClassRange = require("../models/primary/ClassRange");
const FeeStructure = require("../models/primary/FeeStructure");
const SecondaryClass = require("../models/secondary/Class");
const logger = require("./logger");

const EXTRA_EXAM_SESSIONS = 2;

async function getActivePackages() {
  return Package.findAll({
    where: { isActive: true, isDeleted: false },
    order: [["classesPerMonth", "ASC"]],
  });
}

// The secondary (external) student's class/grade isn't in the subject-details
// API response, so it's resolved from the secondary DB's `classes` table
// (same source generateTutorSalary.js uses for tutor pay) and mapped to a
// primary-DB ClassRange for fee lookups.
async function getStudentClassRange(secondaryStudentId) {
  const latestClass = await SecondaryClass.findOne({
    where: { student: secondaryStudentId },
    order: [["id", "DESC"]],
    attributes: ["classnumber"],
  });

  if (!latestClass?.classnumber) return null;

  const classRange = await ClassRange.findOne({
    where: {
      fromClass: { [Op.lte]: latestClass.classnumber },
      toClass: { [Op.gte]: latestClass.classnumber },
      isDeleted: false,
    },
  });

  return classRange || null;
}

// Maps each subject's external firebase-style subject_id to the tuition
// feePerHour configured for this class range + subject (same rate the
// Package Structure page uses), keyed by subject_id for buildBreakdown().
async function getFeeRates(subjectIds, classRangeId) {
  const rates = {};
  if (!classRangeId || !subjectIds.length) return rates;

  const subjects = await Subject.findAll({
    where: { firebase_id: subjectIds },
    attributes: ["id", "firebase_id"],
  });

  if (!subjects.length) return rates;

  const primaryIdByFirebaseId = new Map(
    subjects.map((s) => [s.firebase_id, s.id]),
  );

  const feeStructures = await FeeStructure.findAll({
    where: {
      classRangeId,
      subjectId: [...primaryIdByFirebaseId.values()],
      isDeleted: false,
    },
    attributes: ["subjectId", "feePerHour"],
  });

  const feePerHourBySubjectId = new Map(
    feeStructures.map((f) => [f.subjectId, Number(f.feePerHour)]),
  );

  for (const [firebaseId, primaryId] of primaryIdByFirebaseId) {
    const fee = feePerHourBySubjectId.get(primaryId);
    if (fee) rates[firebaseId] = fee;
  }

  return rates;
}

// Package's monthly price for this subject: feePerHour (class + subject
// specific) * classesPerMonth * packageMultiplier, discounted by
// comboMultiplier when billed together with other subjects — mirrors the
// Package Structure page's formula (base * multiMultiplier when >1 subject
// selected).
function getMonthlyPackagePrice(pkg, feePerHour, comboMultiplier = 1) {
  return (
    feePerHour * pkg.classesPerMonth * (pkg.packageMultiplier || 1) * comboMultiplier
  );
}

// price per session, where a package's total sessions = classes + growth (minus the
// 1 complimentary growth session already counted in classesPerMonth) + question tool exams
function getSessionRate(pkg, feePerHour, comboMultiplier = 1) {
  const totalSessions =
    pkg.classesPerMonth + (pkg.growthSession || 0) - 1 + (pkg.questionToolExam || 0);

  if (!totalSessions || totalSessions <= 0) return null;

  // Fallback to the package's flat price only when no class/subject-specific
  // fee is configured, so billing doesn't silently drop to zero.
  const basis = feePerHour
    ? getMonthlyPackagePrice(pkg, feePerHour, comboMultiplier)
    : pkg.price * comboMultiplier;

  return basis / totalSessions;
}

function findNearestPackage(packages, classesCount) {
  if (!packages.length) return null;

  return packages.reduce((closest, pkg) => {
    const diff = Math.abs(pkg.classesPerMonth - classesCount);
    const closestDiff = Math.abs(closest.classesPerMonth - classesCount);
    return diff < closestDiff ? pkg : closest;
  }, packages[0]);
}

function buildBreakdown(subjects, packages, feeRates = {}) {
  const totalClassesForPackageMatch = subjects.reduce(
    (sum, s) =>
      sum +
      (s.classes_scheduled_current_month || 0) +
      (s.extra_classes_current_month || 0),
    0,
  );

  // One package prices the whole subject bundle together — mirrors the
  // Package Structure page, where a single selected package covers every
  // chosen subject (rather than each subject picking its own nearest
  // package independently).
  const primaryPackage = findNearestPackage(packages, totalClassesForPackageMatch);

  // Package Structure discounts the combined total via multiMultiplier once
  // 2+ subjects are bought together; apply that same discount here.
  const comboMultiplier =
    subjects.length > 1 ? primaryPackage?.multiMultiplier || 1 : 1;

  const breakdown = subjects.map((s) => {
    const classesScheduled = s.classes_scheduled_current_month || 0;
    const extraClasses = s.extra_classes_current_month || 0;
    const feePerHour = feeRates[s.subject_id] || 0;

    const perClassRate = primaryPackage
      ? getSessionRate(primaryPackage, feePerHour, comboMultiplier) || 0
      : 0;

    return {
      subjectId: s.subject_id,
      subjectName: s.subject_name,
      classesScheduled,
      extraClasses,
      packageId: primaryPackage?.id || null,
      packageName: primaryPackage?.name || null,
      perClassRate: Number(perClassRate.toFixed(2)),
      extraClassAmount: Number((extraClasses * perClassRate).toFixed(2)),
      amount: Number(
        ((classesScheduled + extraClasses) * perClassRate).toFixed(2),
      ),
    };
  });

  const totalClasses = breakdown.reduce(
    (sum, b) => sum + b.classesScheduled + b.extraClasses,
    0,
  );

  const classesAmount = Number(
    breakdown.reduce((sum, b) => sum + b.amount, 0).toFixed(2),
  );

  // Exam sessions aren't tied to one subject, so bill them at the blended
  // rate actually earned across this student's subjects/classes rather than
  // an independent package rate.
  const perClassRate =
    totalClasses > 0 ? Number((classesAmount / totalClasses).toFixed(2)) : 0;

  const examFee = {
    sessions: EXTRA_EXAM_SESSIONS,
    rate: perClassRate,
    amount: Number((EXTRA_EXAM_SESSIONS * perClassRate).toFixed(2)),
  };

  const totalAmount = Number((classesAmount + examFee.amount).toFixed(2));

  return {
    breakdown,
    totalClasses,
    classesAmount,
    examFee,
    totalAmount,
    perClassRate,
    primaryPackage,
  };
}

// Convenience wrapper: resolves the student's class range + per-subject fee
// rates, then builds the billing breakdown. Falls back to package-only
// pricing (with a warning) when the student's class can't be resolved.
async function buildStudentBillBreakdown(secondaryStudentId, subjects, packages) {
  const classRange = await getStudentClassRange(secondaryStudentId);

  if (!classRange) {
    logger.warn("No ClassRange resolved for secondary student billing", {
      secondaryStudentId,
    });
  }

  const subjectIds = [...new Set(subjects.map((s) => s.subject_id))];
  const feeRates = await getFeeRates(subjectIds, classRange?.id);

  return buildBreakdown(subjects, packages, feeRates);
}

module.exports = {
  getActivePackages,
  getStudentClassRange,
  getFeeRates,
  getSessionRate,
  findNearestPackage,
  buildBreakdown,
  buildStudentBillBreakdown,
};
