/**
 * Shared student-bill calculation.
 *
 * New billing rule:
 *   perSessionRate = packagePrice / legacySessionCount
 *       legacySessionCount = classesPerMonth + growthSession + questionToolExam
 *       (i.e. the "current amount per session")
 *
 *   examCount      = duration * EXAMS_PER_MONTH          (2 exams per plan month,
 *                                                         no longer the fixed
 *                                                         package.questionToolExam)
 *   totalSessions  = classesPerMonth + growthSession + examCount
 *
 *   amount         = totalSessions * perSessionRate - discount
 *
 * `detail` must be a StudentDetail with its `package` association loaded.
 */

const EXAMS_PER_MONTH = 2;

function getSessionBreakdown(detail) {
  const pkg = (detail && detail.package) || {};

  const classes = Number(pkg.classesPerMonth || 0);
  const growth = Number(pkg.growthSession || 0);
  const legacyExams = Number(pkg.questionToolExam || 0);
  const duration = Number(detail.duration || 1);
  const packagePrice = Number(detail.packagePrice || 0);

  const examCount = duration * EXAMS_PER_MONTH;
  const totalSessions = classes + growth + examCount;

  const legacySessionCount = classes + growth + legacyExams;
  const perSessionRate =
    legacySessionCount > 0 ? packagePrice / legacySessionCount : 0;

  return {
    classes,
    growth,
    legacyExams,
    examCount,
    totalSessions,
    legacySessionCount,
    perSessionRate,
    duration,
  };
}

function computeDetailBillAmount(detail) {
  const { totalSessions, perSessionRate } = getSessionBreakdown(detail);
  const discount = Number((detail && detail.discount) || 0);
  return totalSessions * perSessionRate - discount;
}

module.exports = {
  EXAMS_PER_MONTH,
  getSessionBreakdown,
  computeDetailBillAmount,
};
