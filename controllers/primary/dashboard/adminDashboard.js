const { Op, fn, col, literal } = require("sequelize");

const Student = require("../../../models/primary/Student");
const StudentBill = require("../../../models/primary/StudentBill");
const Expense = require("../../../models/primary/Expense");

const TutorPayroll = require("../../../models/primary/TutorPayroll");
const StaffPayroll = require("../../../models/primary/StaffPayroll");
const CounselorPayroll = require("../../../models/primary/CounselorPayroll");

const User = require("../../../models/primary/User");
const SecondaryUser = require("../../../models/secondary/User");

exports.getDashboard = async (req, res) => {
  try {
    /* ---------------- ACTIVE COUNTS ---------------- */

    const activeStudents = await Student.count({
      where: { isDeleted: false },
    });

    const activeTutors = await SecondaryUser.count({
      where: { role: 3, status: 1 },
    });

    const primaryStaff = await User.count({
      where: { isDeleted: false },
    });

    const secondaryStaff = await SecondaryUser.count({
      where: { role: 2, status: 1 },
    });

    const activeStaff = primaryStaff + secondaryStaff;

    /* ---------------- REVENUE ---------------- */

    const totalRevenue =
      (await StudentBill.sum("amount", {
        where: { status: "Paid", isDeleted: false },
      })) || 0;

    /* ---------------- EXPENSES ---------------- */

    const totalExpenses = (await Expense.sum("amount")) || 0;

    /* ---------------- NET PROFIT ---------------- */

    const netProfit = totalRevenue - totalExpenses;

    /* ---------------- SALARY PENDING ---------------- */

    const tutorSalary = (await TutorPayroll.sum("netSalary")) || 0;
    const staffSalary = (await StaffPayroll.sum("netSalary")) || 0;
    const counselorSalary = (await CounselorPayroll.sum("netSalary")) || 0;

    const salaryPending = tutorSalary + staffSalary + counselorSalary;

    /* ---------------- BILLS PENDING ---------------- */

    const billsPending =
      (await StudentBill.sum("amount", {
        where: {
          status: { [Op.ne]: "Paid" },
          isDeleted: false,
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
      },
      group: [fn("MONTH", col("billDate")), fn("MONTHNAME", col("billDate"))],
      order: [[fn("MONTH", col("billDate")), "ASC"]],
      raw: true,
    });

    /* ---------------- EXPENSE CATEGORY ---------------- */

    const expenseCategory = await Expense.findAll({
      attributes: ["category", [fn("SUM", col("amount")), "amount"]],
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
    console.error(error);
    res.status(500).json({
      message: "Dashboard data error",
    });
  }
};
