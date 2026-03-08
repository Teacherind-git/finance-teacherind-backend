const { Op, fn, col } = require("sequelize");

// ===== PRIMARY DB MODELS =====
const PrimaryUser = require("../../../models/primary/User");
const TutorPayroll = require("../../../models/primary/TutorPayroll");
const StaffPayroll = require("../../../models/primary/StaffPayroll");
const CounselorPayroll = require("../../../models/primary/CounselorPayroll");

const TutorSalary = require("../../../models/primary/TutorSalary");
const StaffSalary = require("../../../models/primary/StaffSalary");

// ===== SECONDARY DB MODELS =====
const SecondaryUser = require("../../../models/secondary/User");

/* ==========================
   DATE RANGE UTILS
========================== */
const getDateRange = (filter) => {
  const now = new Date();
  let startDate, endDate;

  switch (filter) {
    case "today":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
      break;

    case "week":
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    case "month":
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      break;
  }

  return { startDate, endDate };
};

/* ==========================
   DASHBOARD API
========================== */
exports.getDashboardStats = async (req, res) => {
  try {
    const filter = req.query.filter || "month";
    const { startDate, endDate } = getDateRange(filter);

    /* ==========================
       PRIMARY USERS (DATE FILTER ADDED)
    ========================== */
    const primaryWhere = {
      isDeleted: false,
    };

    const [primaryTotal, primaryActive, primaryInactive] = await Promise.all([
      PrimaryUser.count({ where: primaryWhere }),
      PrimaryUser.count({
        where: { ...primaryWhere, status: "Active" },
      }),
      PrimaryUser.count({
        where: { ...primaryWhere, status: "Inactive" },
      }),
    ]);

    /* ==========================
       SECONDARY USERS (ROLE 2 & 3)
    ========================== */
    const secondaryWhere = {
      role: { [Op.in]: [2, 3] },
    };

    const [secondaryTotal, secondaryActive, secondaryInactive] =
      await Promise.all([
        SecondaryUser.count({ where: secondaryWhere }),
        SecondaryUser.count({
          where: { ...secondaryWhere, status: 1 },
        }),
        SecondaryUser.count({
          where: { ...secondaryWhere, status: 0 },
        }),
      ]);

    /* ==========================
       PAYROLL TOTAL (ALL PAYROLLS)
    ========================== */
    const [tutorPayrollSum, staffPayrollSum, counselorPayrollSum] =
      await Promise.all([
        TutorPayroll.sum("netSalary", {
          where: {
            isDeleted: false,
            updatedAt: { [Op.between]: [startDate, endDate] },
          },
        }),
        StaffPayroll.sum("netSalary", {
          where: {
            isDeleted: false,
            updatedAt: { [Op.between]: [startDate, endDate] },
          },
        }),
        CounselorPayroll.sum("netSalary", {
          where: {
            isDeleted: false,
            updatedAt: { [Op.between]: [startDate, endDate] },
          },
        }),
      ]);

    const totalSalaryProcessed =
      (tutorPayrollSum || 0) +
      (staffPayrollSum || 0) +
      (counselorPayrollSum || 0);

    /* ==========================
       SALARY PENDING (ALL SALARIES)
    ========================== */
    const [pendingTutorSalary, pendingStaffSalary] = await Promise.all([
      TutorSalary.count({
        where: {
          isDeleted: false,
          status: "Pending",
          updatedAt: { [Op.between]: [startDate, endDate] },
        },
      }),
      StaffSalary.count({
        where: {
          isDeleted: false,
          status: "Pending",
          updatedAt: { [Op.between]: [startDate, endDate] },
        },
      }),
    ]);

    const totalPendingPayments = pendingTutorSalary + pendingStaffSalary;

    const departmentCountsRaw = await PrimaryUser.findAll({
      attributes: ["department", [fn("COUNT", col("id")), "count"]],
      where: {
        isDeleted: false,
      },
      group: ["department"],
      raw: true,
    });

    /* ==========================
       RESPONSE
    ========================== */
    res.status(200).json({
      success: true,
      filter,
      data: {
        totalEmployees: primaryTotal + secondaryTotal,
        activeEmployees: primaryActive + secondaryActive,
        offBoardedEmployees: primaryInactive + secondaryInactive,
        salaryProcessed: totalSalaryProcessed,
        pendingPayments: totalPendingPayments,
        departmentCountsRaw,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
    });
  }
};
