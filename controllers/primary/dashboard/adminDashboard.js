const { Op, fn, col } = require("sequelize");

const Student = require("../../../models/primary/Student");
const StudentBill = require("../../../models/primary/StudentBill");
const Expense = require("../../../models/primary/Expense");

const TutorPayroll = require("../../../models/primary/TutorPayroll");
const StaffPayroll = require("../../../models/primary/StaffPayroll");
const CounselorPayroll = require("../../../models/primary/CounselorPayroll");

const User = require("../../../models/primary/User");
const SecondaryUser = require("../../../models/secondary/User");

// ----------------------- DATE RANGE HELPER -----------------------
const getDateRange = (filter) => {
  if (filter === "all") {
    return { startDate: null, endDate: null }; // no filter
  }

  const now = new Date();
  let startDate, endDate;

  switch (filter) {
    case "today":
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      break;

    case "week":
      const current = new Date();
      const day = current.getDay();
      startDate = new Date(current);
      startDate.setDate(current.getDate() - day);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "year":
      const year = now.getFullYear();
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "month":
    default:
      const y = now.getFullYear();
      const m = now.getMonth();
      startDate = new Date(y, m, 1);
      endDate = new Date(y, m + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
  }

  return { startDate, endDate };
};

// ----------------------- MAIN CONTROLLER -----------------------
exports.getDashboard = async (req, res) => {
  try {
    const filter = req.query.filter || "all"; // default to all data
    const { startDate, endDate } = getDateRange(filter);

    // Build date condition only if startDate and endDate exist
    const dateCondition = startDate && endDate ? { [Op.between]: [startDate, endDate] } : undefined;

    /* ---------------- ACTIVE COUNTS ---------------- */
    const activeStudents = await Student.count({
      where: { isDeleted: false, ...(dateCondition && { createdAt: dateCondition }) },
    });

    const activeTutors = await SecondaryUser.count({
      where: { role: 3, status: 1, ...(dateCondition && { created_at: dateCondition }) },
    });

    const primaryStaff = await User.count({
      where: { isDeleted: false, ...(dateCondition && { createdAt: dateCondition }) },
    });

    const secondaryStaff = await SecondaryUser.count({
      where: { role: 2, status: 1, ...(dateCondition && { created_at: dateCondition }) },
    });

    const activeStaff = primaryStaff + secondaryStaff;

    /* ---------------- REVENUE ---------------- */
    const totalRevenue =
      (await StudentBill.sum("amount", {
        where: {
          status: "Paid",
          isDeleted: false,
          ...(dateCondition && { billDate: dateCondition }),
        },
      })) || 0;

    /* ---------------- EXPENSES ---------------- */
    const totalExpenses =
      (await Expense.sum("amount", {
        where: dateCondition ? { createdAt: dateCondition } : undefined,
      })) || 0;

    /* ---------------- NET PROFIT ---------------- */
    const netProfit = totalRevenue - totalExpenses;

    /* ---------------- SALARY PENDING ---------------- */
    const tutorSalary =
      (await TutorPayroll.sum("netSalary", {
        where: dateCondition ? { createdAt: dateCondition } : undefined,
      })) || 0;

    const staffSalary =
      (await StaffPayroll.sum("netSalary", {
        where: dateCondition ? { createdAt: dateCondition } : undefined,
      })) || 0;

    const counselorSalary =
      (await CounselorPayroll.sum("netSalary", {
        where: dateCondition ? { createdAt: dateCondition } : undefined,
      })) || 0;

    const salaryPending = tutorSalary + staffSalary + counselorSalary;

    /* ---------------- BILLS PENDING ---------------- */
    const billsPending =
      (await StudentBill.sum("amount", {
        where: {
          status: { [Op.ne]: "Paid" },
          isDeleted: false,
          ...(dateCondition && { billDate: dateCondition }),
        },
      })) || 0;

    /* ---------------- REVENUE CHART (MONTHLY) ---------------- */
    const revenueChart = await StudentBill.findAll({
      attributes: [
        [fn("MONTH", col("billDate")), "monthNumber"],
        [fn("MONTHNAME", col("billDate")), "month"],
        [fn("SUM", col("amount")), "revenue"],
      ],
      where: {
        status: "Paid",
        isDeleted: false,
        ...(dateCondition && { billDate: dateCondition }),
      },
      group: [fn("MONTH", col("billDate")), fn("MONTHNAME", col("billDate"))],
      order: [[fn("MONTH", col("billDate")), "ASC"]],
      raw: true,
    });

    /* ---------------- EXPENSE CATEGORY ---------------- */
    const expenseCategory = await Expense.findAll({
      attributes: ["category", [fn("SUM", col("amount")), "amount"]],
      where: dateCondition ? { createdAt: dateCondition } : undefined,
      group: ["category"],
      raw: true,
    });

    /* ---------------- PIE DATA ---------------- */
    const pieData = [
      { name: "Revenue", value: totalRevenue },
      { name: "Expenses", value: totalExpenses },
      { name: "Profit", value: netProfit },
    ];

    /* ---------------- RESPONSE ---------------- */
    res.json({
      filter,
      startDate,
      endDate,
      stats: {
        activeStudents,
        activeTutors,
        activeStaff,
        totalRevenue,
        totalExpenses,
        netProfit,
        salaryPending,
        billsPending,
      },
      revenueChart,
      expenseCategory,
      pieData,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({
      message: "Dashboard data error",
    });
  }
};