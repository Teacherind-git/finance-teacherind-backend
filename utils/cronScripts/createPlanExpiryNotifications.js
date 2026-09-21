const { Op } = require("sequelize");
const Notification = require("../../models/primary/Notification");
const PrimaryUser = require("../../models/primary/User");
const SecondaryUser = require("../../models/secondary/User");
const SubjectPlan = require("../../models/secondary/SubjectPlan");
const cronLogger = require("../cronLogger");

const TIME_ZONE = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;

const getDateInTimeZone = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
};

async function createPlanExpiryNotifications() {
  const notificationDate = getDateInTimeZone();
  // Notify once the day before expiry and once on the expiry date.
  const reminderEndDate = addDays(notificationDate, 1);

  const plans = await SubjectPlan.findAll({
    where: {
      ended_at: null,
      expiry_date: { [Op.between]: [notificationDate, reminderEndDate] },
    },
    attributes: ["id", "student_id", "subject_name", "expiry_date"],
    raw: true,
  });

  if (!plans.length) {
    cronLogger.info("No student plans require expiry notifications");
    return;
  }

  const students = await SecondaryUser.findAll({
    where: { id: { [Op.in]: plans.map((plan) => plan.student_id) } },
    attributes: ["id", "fullname", "name"],
    raw: true,
  });
  const studentMap = new Map(
    students.map((student) => [
      String(student.id),
      student.fullname || student.name || `Student ${student.id}`,
    ]),
  );

  const users = await PrimaryUser.findAll({
    where: { status: "Active", isDeleted: false },
    attributes: ["id"],
    raw: true,
  });

  let created = 0;
  for (const user of users) {
    for (const plan of plans) {
      const studentName = studentMap.get(String(plan.student_id));
      if (!studentName) continue;

      const [notification, wasCreated] = await Notification.findOrCreate({
        where: {
          userId: user.id,
          type: "PLAN_EXPIRY",
          referenceKey: String(plan.id),
          notificationDate,
        },
        defaults: {
          title: "Student plan expiry",
          message:
            plan.expiry_date === notificationDate
              ? `${studentName}'s ${plan.subject_name || "subject"} plan expires today (${plan.expiry_date}).`
              : `${studentName}'s ${plan.subject_name || "subject"} plan expires tomorrow (${plan.expiry_date}).`,
        },
      });

      if (wasCreated) created++;
    }
  }

  cronLogger.info("Plan expiry notifications processed", {
    plans: plans.length,
    users: users.length,
    created,
  });
}

module.exports = createPlanExpiryNotifications;