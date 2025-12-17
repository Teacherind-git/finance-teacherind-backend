const { Op, fn, col } = require("sequelize");
const StudentBill = require("../../../models/primary/StudentBill");
const Expense = require("../../../models/primary/Expense");
const StaffSalary = require("../../../models/primary/StaffSalary");
const TutorSalary = require("../../../models/primary/TutorSalary");
const User = require("../../../models/primary/User");

exports.getFinanceSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter =
      startDate && endDate ? { [Op.between]: [startDate, endDate] } : null;

    const { prevStart, prevEnd } = dateFilter
      ? getPreviousPeriod(startDate, endDate)
      : {};

    /* ===================== REVENUE ===================== */
    const [revenueAmount, revenueCount] = await Promise.all([
      StudentBill.sum("amount", {
        where: {
          isDeleted: false,
          ...(dateFilter && { billDate: dateFilter }),
        },
      }),
      StudentBill.count({
        where: {
          isDeleted: false,
          ...(dateFilter && { billDate: dateFilter }),
        },
      }),
    ]);

    const prevRevenueAmount = dateFilter
      ? await StudentBill.sum("amount", {
          where: {
            isDeleted: false,
            billDate: { [Op.between]: [prevStart, prevEnd] },
          },
        })
      : 0;

    const revenuePercentage = prevRevenueAmount
      ? (((revenueAmount || 0) - prevRevenueAmount) / prevRevenueAmount) * 100
      : 0;

    /* ===================== EXPENSES ===================== */
    const [expenseAmount, expenseCount] = await Promise.all([
      Expense.sum("amount", {
        where: {
          ...(dateFilter && { expenseDate: dateFilter }),
        },
      }),
      Expense.count({
        where: {
          ...(dateFilter && { expenseDate: dateFilter }),
        },
      }),
    ]);

    const prevExpenseAmount = dateFilter
      ? await Expense.sum("amount", {
          where: {
            expenseDate: { [Op.between]: [prevStart, prevEnd] },
          },
        })
      : 0;

    const expensePercentage = prevExpenseAmount
      ? (((expenseAmount || 0) - prevExpenseAmount) / prevExpenseAmount) * 100
      : 0;

    /* ===================== PENDING BILLS ===================== */
    const [pendingBillAmount, pendingBillCount] = await Promise.all([
      StudentBill.sum("amount", {
        where: {
          status: { [Op.ne]: "Paid" },
          isDeleted: false,
        },
      }),
      StudentBill.count({
        where: {
          status: { [Op.ne]: "Paid" },
          isDeleted: false,
        },
      }),
    ]);

    /* ===================== PENDING SALARIES ===================== */
    const [pendingStaffAmount, pendingStaffCount] = await Promise.all([
      StaffSalary.sum("amount", {
        where: { status: "Pending", isDeleted: false },
      }),
      StaffSalary.count({
        where: { status: "Pending", isDeleted: false },
      }),
    ]);

    const [pendingTutorAmount, pendingTutorCount] = await Promise.all([
      TutorSalary.sum("amount", {
        where: { status: "Pending", isDeleted: false },
      }),
      TutorSalary.count({
        where: { status: "Pending", isDeleted: false },
      }),
    ]);

    /* ===================== NET PROFIT ===================== */
    const profitAmount = (revenueAmount || 0) - (expenseAmount || 0);
    const profitMargin = revenueAmount
      ? (profitAmount / revenueAmount) * 100
      : 0;

    /* ===================== RESPONSE ===================== */
    return res.status(200).json({
      success: true,
      data: {
        revenue: {
          amount: revenueAmount || 0,
          count: revenueCount,
          percentage: Number(revenuePercentage.toFixed(2)),
          status: getTrendStatus(revenuePercentage), // 👈 up / down
        },

        expenses: {
          amount: expenseAmount || 0,
          count: expenseCount,
          percentage: Number(expensePercentage.toFixed(2)),
          status: getTrendStatus(expensePercentage),
        },

        profit: {
          amount: profitAmount || 0,
          percentage: Number(profitMargin.toFixed(2)),
          status: getTrendStatus(profitMargin),
        },

        pendingBills: {
          amount: pendingBillAmount || 0,
          count: pendingBillCount,
        },

        pendingSalaries: {
          amount: (pendingStaffAmount || 0) + (pendingTutorAmount || 0),
          count: pendingStaffCount + pendingTutorCount,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch finance summary" });
  }
};

/* ---------------- Month → Date Range ---------------- */
function getMonthDateRange(month) {
  const now = new Date();
  let start, end;

  switch (month) {
    case "this-month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;

    case "last-month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;

    case "this-year":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      break;

    default:
      return null;
  }

  return { [Op.between]: [start, end] };
}

/* ---------------- MAIN FUNCTION ---------------- */
exports.searchFinanceTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "date",
      sortOrder = "DESC",
      filters = {},
    } = req.body;

    const { type, status, search, month } = filters;

    const offset = (page - 1) * Number(limit);
    const dateRange = month ? getMonthDateRange(month) : null;

    /* ===================== FETCH DATA ===================== */

    const bills =
      type && type !== "Revenue"
        ? []
        : await StudentBill.findAll({
            where: {
              isDeleted: false,
              ...(status && { status }),
              ...(dateRange && { billDate: dateRange }),
            },
          });

    const expenses =
      type && type !== "Expense"
        ? []
        : await Expense.findAll({
            where: {
              ...(dateRange && { expenseDate: dateRange }),
            },
          });

    const staffSalaries =
      type && type !== "Salary"
        ? []
        : await StaffSalary.findAll({
            where: {
              isDeleted: false,
              ...(status && { status }),
              ...(dateRange && { salaryDate: dateRange }),
            },
          });

    const tutorSalaries =
      type && type !== "Salary"
        ? []
        : await TutorSalary.findAll({
            where: {
              isDeleted: false,
              ...(status && { status }),
              ...(dateRange && { salaryDate: dateRange }),
            },
          });

    /* ===================== COLLECT createdBy ===================== */

    const createdByIds = [
      ...bills.map((b) => b.createdBy),
      ...expenses.map((e) => e.createdBy),
      ...staffSalaries.map((s) => s.createdBy),
      ...tutorSalaries.map((t) => t.createdBy),
    ].filter(Boolean);

    /* ===================== FETCH USERS ===================== */

    const creators = createdByIds.length
      ? await User.findAll({
          where: {
            id: { [Op.in]: createdByIds },
            isDeleted: false,
          },
          attributes: ["id", "firstName", "lastName"],
        })
      : [];

    /* ===================== CREATE LOOKUP MAP ===================== */

    const creatorMap = creators.reduce((acc, u) => {
      acc[u.id] = {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
      };
      return acc;
    }, {});

    /* ===================== NORMALIZE DATA ===================== */

    let transactions = [
      ...bills.map((b) => ({
        transactionId: b.invoiceId,
        date: b.billDate,
        type: "Revenue",
        category: "Student Fee",
        description: `Invoice ${b.invoiceId}`,
        amount: b.amount,
        status: b.status,
        department: "Academics",
        createdBy: creatorMap[b.createdBy] || null,
      })),

      ...expenses.map((e) => ({
        transactionId: `EXP-${e.id}`,
        date: e.expenseDate,
        type: "Expense",
        category: e.category,
        description: e.description,
        amount: e.amount,
        status: "Completed",
        department: "Admin",
        createdBy: creatorMap[e.createdBy] || null,
      })),

      ...staffSalaries.map((s) => ({
        transactionId: `SAL-${s.id}`,
        date: s.salaryDate,
        type: "Salary",
        category: "Staff Salary",
        description: "Staff Payroll",
        amount: s.amount,
        status: s.status,
        department: "HR",
        createdBy: creatorMap[s.createdBy] || null,
      })),

      ...tutorSalaries.map((t) => ({
        transactionId: `TUT-${t.id}`,
        date: t.salaryDate,
        type: "Salary",
        category: "Tutor Salary",
        description: "Tutor Payroll",
        amount: t.amount,
        status: t.status,
        department: "Academics",
        createdBy: creatorMap[t.createdBy] || null,
      })),
    ];

    /* ===================== SEARCH ===================== */

    if (search) {
      const keyword = search.toLowerCase();
      transactions = transactions.filter((t) =>
        [
          t.transactionId,
          t.type,
          t.category,
          t.description,
          t.status,
          t.department,
          t.createdBy?.name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      );
    }

    /* ===================== SORT ===================== */

    transactions.sort((a, b) => {
      const aVal = sortBy === "createdBy" ? a.createdBy?.name : a[sortBy];
      const bVal = sortBy === "createdBy" ? b.createdBy?.name : b[sortBy];

      if (aVal > bVal) return sortOrder === "ASC" ? 1 : -1;
      if (aVal < bVal) return sortOrder === "ASC" ? -1 : 1;
      return 0;
    });

    /* ===================== PAGINATION ===================== */

    const total = transactions.length;
    const paginatedData = transactions.slice(offset, offset + Number(limit));

    /* ===================== RESPONSE ===================== */

    res.json({
      data: paginatedData,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Finance transaction search failed:", error);
    res.status(500).json({
      message: "Failed to fetch finance transactions",
    });
  }
};

const getTrendStatus = (percentage) => {
  if (percentage > 0) return "up";
  if (percentage < 0) return "down";
  return "neutral";
};
