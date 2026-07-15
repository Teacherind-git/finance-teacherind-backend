const Package = require("../models/primary/Package");

const EXTRA_EXAM_SESSIONS = 2;

async function getActivePackages() {
  return Package.findAll({
    where: { isActive: true, isDeleted: false },
    order: [["classesPerMonth", "ASC"]],
  });
}

// price per session, where a package's total sessions = classes + growth (minus the
// 1 complimentary growth session already counted in classesPerMonth) + question tool exams
function getSessionRate(pkg) {
  const totalSessions =
    pkg.classesPerMonth + (pkg.growthSession || 0) - 1 + (pkg.questionToolExam || 0);

  if (!totalSessions || totalSessions <= 0) return null;
  return pkg.price / totalSessions;
}

function findNearestPackage(packages, classesCount) {
  if (!packages.length) return null;

  return packages.reduce((closest, pkg) => {
    const diff = Math.abs(pkg.classesPerMonth - classesCount);
    const closestDiff = Math.abs(closest.classesPerMonth - classesCount);
    return diff < closestDiff ? pkg : closest;
  }, packages[0]);
}

function buildBreakdown(subjects, packages) {
  const breakdown = subjects.map((s) => {
    const classesScheduled = s.classes_scheduled_current_month || 0;
    const extraClasses = s.extra_classes_current_month || 0;

    const matchedPackage = findNearestPackage(packages, classesScheduled);
    const perClassRate = matchedPackage ? getSessionRate(matchedPackage) || 0 : 0;

    return {
      subjectId: s.subject_id,
      subjectName: s.subject_name,
      classesScheduled,
      extraClasses,
      packageId: matchedPackage?.id || null,
      packageName: matchedPackage?.name || null,
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

  const primaryPackage = findNearestPackage(packages, totalClasses);
  const perClassRate = primaryPackage
    ? Number((getSessionRate(primaryPackage) || 0).toFixed(2))
    : 0;

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

module.exports = {
  getActivePackages,
  getSessionRate,
  findNearestPackage,
  buildBreakdown,
};
