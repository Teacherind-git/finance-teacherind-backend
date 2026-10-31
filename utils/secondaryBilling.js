const { Op } = require("sequelize");
const Package = require("../models/primary/Package");
const Subject = require("../models/primary/Subject");
const ClassRange = require("../models/primary/ClassRange");
const FeeStructure = require("../models/primary/FeeStructure");
const SecondaryClass = require("../models/secondary/Class");
const logger = require("./logger");

// Exam sessions are billed at 2 per plan month (e.g. a "3_month" plan => 6),
// replacing the old fixed count of 2.
const EXAMS_PER_MONTH = 2;

// Fixed price per exam (EXAM_PRICE env, default ₹150)
const getExamPrice = () => Number(process.env.EXAM_PRICE) || 150;

// Turns a SubjectPlan.plan_type string ("3_month", "1_month", "6_month",
// "yearly", ...) into a month count. Falls back to 1 when unparseable.
function parsePlanMonths(planType) {
  if (!planType) return 1;

  const str = String(planType).toLowerCase().trim();

  const num = parseInt(str, 10);
  if (!isNaN(num) && num > 0) return num;

  if (str.includes("year") || str.includes("annual")) return 12;
  if (str.includes("half")) return 6;
  if (str.includes("quarter")) return 3;
  if (str.includes("month")) return 1;

  return 1;
}

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

function findNearestPackage(packages, classesCount) {
  if (!packages.length) return null;

  return packages.reduce((closest, pkg) => {
    const diff = Math.abs(pkg.classesPerMonth - classesCount);
    const closestDiff = Math.abs(closest.classesPerMonth - classesCount);
    return diff < closestDiff ? pkg : closest;
  }, packages[0]);
}

// examSessions overrides the default count (plan months * 2) when given.
function buildBreakdown(
  subjects,
  packages,
  feeRates = {},
  planMonths = 1,
  examSessions = null,
) {
  const totalClassesForPackageMatch = subjects.reduce(
    (sum, s) =>
      sum +
      (s.classes_scheduled_current_month || 0) +
      (s.extra_classes_current_month || 0),
    0,
  );

  // The package is only used to label the bill; pricing comes from the
  // fee structure alone.
  const primaryPackage = findNearestPackage(packages, totalClassesForPackageMatch);

  const breakdown = subjects.map((s) => {
    const classesScheduled = s.classes_scheduled_current_month || 0;
    // Bill the package's fixed monthly class quota, not the classes actually
    // scheduled this month. Extra classes are still charged on top.
    const packageClasses = s.package_classes || 0;
    const extraClasses = s.extra_classes_current_month || 0;
    // Each class is charged at the fee per hour configured for this
    // class range + subject.
    const perClassRate = feeRates[s.subject_id] || 0;

    const billedClasses = packageClasses + extraClasses;

    return {
      subjectId: s.subject_id,
      subjectName: s.subject_name,
      classesScheduled,
      packageClasses,
      billedClasses,
      extraClasses,
      packageId: primaryPackage?.id || null,
      packageName: primaryPackage?.name || null,
      perClassRate: Number(perClassRate.toFixed(2)),
      extraClassAmount: Number((extraClasses * perClassRate).toFixed(2)),
      amount: Number((billedClasses * perClassRate).toFixed(2)),
    };
  });

  const totalClasses = breakdown.reduce(
    (sum, b) => sum + b.billedClasses,
    0,
  );

  const classesAmount = Number(
    breakdown.reduce((sum, b) => sum + b.amount, 0).toFixed(2),
  );

  // Blended class rate across this student's subjects (stored on the bill)
  const perClassRate =
    totalClasses > 0 ? Number((classesAmount / totalClasses).toFixed(2)) : 0;

  // Exam count defaults to plan months * 2 (max across the student's active
  // plans); each exam is charged at the fixed exam price.
  const sessions =
    examSessions != null
      ? examSessions
      : Math.max(1, Number(planMonths) || 1) * EXAMS_PER_MONTH;
  const examRate = getExamPrice();

  const examFee = {
    sessions,
    rate: examRate,
    amount: Number((sessions * examRate).toFixed(2)),
  };

  const totalAmount = Number((classesAmount + examFee.amount).toFixed(2));

  // Subjects with classes to bill but no fee configured for this class range
  const missingFeeSubjects = breakdown
    .filter((b) => b.billedClasses > 0 && !b.perClassRate)
    .map((b) => b.subjectName);

  return {
    breakdown,
    totalClasses,
    classesAmount,
    examFee,
    totalAmount,
    perClassRate,
    primaryPackage,
    missingFeeSubjects,
  };
}

// Convenience wrapper: resolves the student's class range + per-subject fee
// rates, then builds the billing breakdown. Falls back to package-only
// pricing (with a warning) when the student's class can't be resolved.
async function buildStudentBillBreakdown(
  secondaryStudentId,
  subjects,
  packages,
  planMonths = 1,
  examSessions = null,
) {
  const classRange = await getStudentClassRange(secondaryStudentId);

  if (!classRange) {
    logger.warn("No ClassRange resolved for secondary student billing", {
      secondaryStudentId,
    });
  }

  const subjectIds = [...new Set(subjects.map((s) => s.subject_id))];
  const feeRates = await getFeeRates(subjectIds, classRange?.id);

  return buildBreakdown(subjects, packages, feeRates, planMonths, examSessions);
}

/* ---------------- BILL EDITS ---------------- */

const round2 = (n) => Number(Number(n || 0).toFixed(2));

class BillAdjustmentError extends Error {}

const wholeNumber = (value, label, min = 0) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) {
    throw new BillAdjustmentError(
      `${label} must be a whole number of ${min} or more`,
    );
  }
  return n;
};

const money = (value, label) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new BillAdjustmentError(`${label} must be 0 or more`);
  }
  return round2(n) || 0; // never store -0
};

// Bill lines as they currently stand: the edited version when the bill has
// been edited, otherwise the lines as generated.
function getEffectiveBreakdown(breakdown = {}) {
  const adj = breakdown.adjustments;

  if (adj?.subjects) {
    return {
      subjects: adj.subjects,
      examFee: adj.examFee,
      discount: adj.discount || 0,
      note: adj.note || null,
    };
  }

  return {
    subjects: (breakdown.subjects || []).map((s) => {
      const packageClasses =
        s.packageClasses != null ? s.packageClasses : s.classesScheduled || 0;
      return {
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        packageName: s.packageName || null,
        packageClasses,
        extraClasses: s.extraClasses || 0,
        perClassRate: s.perClassRate || 0,
        discount: 0,
        grossAmount: round2(s.amount),
        amount: round2(s.amount),
      };
    }),
    examFee: breakdown.examFee || { sessions: 0, rate: 0, amount: 0 },
    discount: 0,
    note: null,
  };
}

// Validates an edit request against the generated bill and returns the new
// adjustments block plus the resulting bill amount. Only discounts (per
// subject and for the whole bill), the exam count and the note can change;
// class counts and rates always stay as generated. Subjects are matched to
// the generated lines by subjectId.
function applyBillAdjustments(breakdown, input = {}) {
  const current = getEffectiveBreakdown(breakdown);
  const edits = new Map(
    (Array.isArray(input.subjects) ? input.subjects : []).map((s) => [
      String(s.subjectId),
      s,
    ]),
  );

  const subjects = current.subjects.map((s) => {
    const edit = edits.get(String(s.subjectId)) || {};
    const label = s.subjectName || "Subject";

    const discount = money(edit.discount ?? s.discount, `${label} discount`);
    const grossAmount = round2(s.grossAmount);

    if (discount > grossAmount) {
      throw new BillAdjustmentError(
        `${label} discount cannot exceed ₹${grossAmount}`,
      );
    }

    return {
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      packageName: s.packageName || null,
      packageClasses: s.packageClasses,
      extraClasses: s.extraClasses,
      perClassRate: s.perClassRate,
      discount,
      grossAmount,
      amount: round2(grossAmount - discount),
    };
  });

  const examSessions = wholeNumber(
    input.examFee?.sessions ?? current.examFee?.sessions ?? 0,
    "Exam count",
    1,
  );
  // Exams are always charged at the fixed exam price
  const examRate = getExamPrice();
  const examFee = {
    sessions: examSessions,
    rate: examRate,
    amount: round2(examSessions * examRate),
  };

  const subjectsTotal = round2(subjects.reduce((sum, s) => sum + s.amount, 0));
  const grossAmount = round2(subjectsTotal + examFee.amount);

  const discount = money(input.discount ?? current.discount, "Bill discount");
  if (discount > grossAmount) {
    throw new BillAdjustmentError(
      `Bill discount cannot exceed ₹${grossAmount}`,
    );
  }

  const note =
    input.note !== undefined
      ? String(input.note || "").trim() || null
      : current.note;

  return {
    adjustments: {
      subjects,
      examFee,
      discount,
      note,
      subjectDiscount: round2(subjects.reduce((sum, s) => sum + s.discount, 0)),
      grossAmount,
    },
    amount: round2(grossAmount - discount),
  };
}

module.exports = {
  EXAMS_PER_MONTH,
  getExamPrice,
  parsePlanMonths,
  getActivePackages,
  getStudentClassRange,
  getFeeRates,
  findNearestPackage,
  buildBreakdown,
  buildStudentBillBreakdown,
  BillAdjustmentError,
  getEffectiveBreakdown,
  applyBillAdjustments,
};
