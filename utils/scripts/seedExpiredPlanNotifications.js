// Creates PLAN_EXPIRY notifications for plans that have already expired
// (and not been ended), for the users allowed to see them. Safe to re-run.
const { Op } = require("sequelize");
const Notification = require("../../models/primary/Notification");
const PrimaryUser = require("../../models/primary/User");
const Role = require("../../models/primary/Role");
const SecondaryUser = require("../../models/secondary/User");
const SubjectPlan = require("../../models/secondary/SubjectPlan");
const logger = require("../../utils/logger");

const LIMIT = Number(process.argv[2]) || 10;

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

(async () => {
  try {
    const plans = await SubjectPlan.findAll({
      where: { ended_at: null, expiry_date: { [Op.lt]: today } },
      attributes: ["id", "student_id", "subject_name", "expiry_date"],
      order: [["expiry_date", "DESC"]],
      limit: LIMIT,
      raw: true,
    });

    if (!plans.length) {
      logger.info("No expired plans found");
      process.exit(0);
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
      where: {
        status: "Active",
        isDeleted: false,
        [Op.or]: [
          { "$role.name$": { [Op.in]: ["SuperAdmin", "Admin"] } },
          { department: "Finance" },
        ],
      },
      include: [{ model: Role, as: "role", attributes: [] }],
      attributes: ["id"],
      raw: true,
    });

    let created = 0;
    for (const user of users) {
      for (const plan of plans) {
        const studentName =
          studentMap.get(String(plan.student_id)) || `Student ${plan.student_id}`;

        const [, wasCreated] = await Notification.findOrCreate({
          where: {
            userId: user.id,
            type: "PLAN_EXPIRY",
            referenceKey: String(plan.id),
            notificationDate: today,
          },
          defaults: {
            title: "Student plan expired",
            message: `${studentName}'s ${plan.subject_name || "subject"} plan expired on ${plan.expiry_date}.`,
          },
        });
        if (wasCreated) created++;
      }
    }

    logger.info("Expired plan notifications seeded", {
      plans: plans.length,
      users: users.length,
      created,
    });
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error seeding expired plan notifications:", {
      message: error.message,
      sqlMessage: error.parent?.sqlMessage,
      stack: error.stack,
    });
    process.exit(1);
  }
})();
