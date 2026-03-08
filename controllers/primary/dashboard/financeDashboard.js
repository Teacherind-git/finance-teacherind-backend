const { Op, fn, col, literal } = require("sequelize");
const Expense = require("../../../models/primary/Expense");
const StudentBill = require("../../../models/primary/StudentBill");
const TutorSalary = require("../../../models/primary/TutorSalary");
const StaffSalary = require("../../../models/primary/StaffSalary");

/* ==========================
   FINANCE DASHBOARD
========================== */
exports.getFinanceDashboard = async (req, res) => {
  try {
    /* ==========================
       TOTAL REVENUE
       (PAID STUDENT BILLS)
    ========================== */
    const totalRevenue =
      (await StudentBill.sum("amount", {
        where: {
          status: "Paid",
          isDeleted: false,
        },
      })) || 0;

    /* ==========================
       APPROVED SALARIES (PAYOUTS)
    ========================== */
    const tutorSalaryPaid =
      (await TutorSalary.sum("amount", {
        where: {
          status: "Paid",
          isDeleted: false,
        },
      })) || 0;

    const staffSalaryPaid =
      (await StaffSalary.sum("amount", {
        where: {
          status: "Paid",
          isDeleted: false,
        },
      })) || 0;

    const monthlyPayouts = tutorSalaryPaid + staffSalaryPaid;

    /* ==========================
       PENDING INVOICES
       (UNAPPROVED SALARIES)
    ========================== */
    const pendingTutor = await TutorSalary.count({
      where: {
        status: { [Op.ne]: "Approved" },
        isDeleted: false,
      },
    });

    const pendingStaff = await StaffSalary.count({
      where: {
        status: { [Op.ne]: "Approved" },
        isDeleted: false,
      },
    });

    const pendingInvoices = pendingTutor + pendingStaff;

    /* ==========================
       OTHER EXPENSES
    ========================== */
    const otherExpenses = (await Expense.sum("amount")) || 0;

    /* ==========================
       TOTAL EXPENSES
    ========================== */
    const totalExpenses = otherExpenses + monthlyPayouts;

    /* ==========================
       PROFIT / LOSS
    ========================== */
    const profit = totalRevenue - totalExpenses;

    /* ==========================
       RESPONSE
    ========================== */
    return res.json({
      success: true,
      data: {
        totalRevenue,
        pendingInvoices,
        totalExpenses,
        profit,
        monthlyPayouts,
      },
    });
  } catch (error) {
    console.error("Finance Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load finance dashboard",
    });
  }
};
