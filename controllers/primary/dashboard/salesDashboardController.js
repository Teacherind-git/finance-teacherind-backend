const { Sequelize, Op } = require("sequelize");
const Student = require("../../../models/primary/Student");
const StudentBill = require("../../../models/primary/StudentBill");

// ----------------------- DATE RANGE HELPER -----------------------
const getDateRange = (filter) => {
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
      break;

    case "month":
    default:
      const y = now.getFullYear();
      const m = now.getMonth();
      startDate = new Date(y, m, 1);
      endDate = new Date(y, m + 1, 0);
      break;
  }

  return { startDate, endDate };
};

// ----------------------- WEEKLY SPLIT HELPER -----------------------
const generateWeeklyData = async (startDate, endDate) => {
  const weeks = [];

  let current = new Date(startDate);
  while (current <= endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // DB QUERIES FOR EACH WEEK
    const leads = await Student.count({
      where: {
        isDeleted: false,
        createdAt: { [Op.between]: [weekStart, weekEnd] },
      },
    });

    const converted = await Student.count({
      where: {
        isDeleted: false,
        status: "Converted",
        createdAt: { [Op.between]: [weekStart, weekEnd] },
      },
    });

    const revenue = await StudentBill.sum("amount", {
      where: {
        isDeleted: false,
        status: "Paid",
        billDate: { [Op.between]: [weekStart, weekEnd] },
      },
    });

    weeks.push({
      week: weekStart.toLocaleDateString(),
      leads,
      converted,
      revenue: revenue || 0,
    });

    current.setDate(current.getDate() + 7); // next week
  }

  return weeks;
};

// ----------------------- MAIN CONTROLLER -----------------------
const getDashboardStats = async (req, res) => {
  try {
    const filter = req.query.filter || "month";
    const { startDate, endDate } = getDateRange(filter);

    const studentFilter = {
      isDeleted: false,
      createdAt: { [Op.between]: [startDate, endDate] },
    };

    const billFilter = {
      isDeleted: false,
      billDate: { [Op.between]: [startDate, endDate] },
    };

    // -------- FIXED INDEX ORDER + CORRECT COUNTS --------
    const [
      totalLeads,
      websiteJoining,
      metaJoining,
      referralCount, // FIXED: correct order
      demoCount,
      convertedCount,
      discardedCount,
      totalRevenue,
      pendingPayments,
    ] = await Promise.all([
      Student.count({ where: studentFilter }),

      Student.count({ where: { ...studentFilter, source: "website" } }),

      Student.count({ where: { ...studentFilter, source: "meta" } }),

      Student.count({ where: { ...studentFilter, source: "referral" } }),

      Student.count({ where: { ...studentFilter, status: "Demo" } }),

      Student.count({ where: { ...studentFilter, status: "Converted" } }),

      Student.count({ where: { ...studentFilter, status: "Discarded" } }),

      StudentBill.sum("amount", { where: { ...billFilter, status: "Paid" } }),

      StudentBill.sum("amount", {
        where: { ...billFilter, status: { [Op.ne]: "Paid" } },
      }),
    ]);

    // -------- GENERATE CHART DATA --------
    const chartData = await generateWeeklyData(startDate, endDate);

    // ------------------ PIE CHART DATA ------------------

    // Deal Status Distribution
    const dealStatusDistribution = [
      {
        name: "Closed Deals",
        value: convertedCount || 0,
      },
      {
        name: "In Negotiation",
        value: demoCount || 0,
      },
      {
        name: "Follow-up Pending",
        value: await Student.count({
          where: { ...studentFilter, status: "Followup" },
        }),
      },
      {
        name: "Lost",
        value: discardedCount || 0,
      },
    ];

    // Revenue Distribution by Product / Package
    const revenueDistribution = [
      {
        name: "Paid",
        value:
          (await StudentBill.sum("amount", {
            where: { ...billFilter, status: "Paid" },
          })) || 0,
      },
      {
        name: "Pending",
        value:
          (await StudentBill.sum("amount", {
            where: { ...billFilter, status: "Pending" },
          })) || 0,
      },
      {
        name: "Generated",
        value:
          (await StudentBill.sum("amount", {
            where: { ...billFilter, status: "Generated" },
          })) || 0,
      },
    ];

    return res.status(200).json({
      filter,
      startDate,
      endDate,

      // Summary Stats
      totalLeads: totalLeads || 0,
      websiteJoining,
      metaJoining,
      referrals: referralCount || 0,
      demo: demoCount || 0,
      converted: convertedCount || 0,
      discarded: discardedCount || 0,
      totalRevenue: totalRevenue || 0,
      paymentsPending: pendingPayments || 0,

      // Chart Data
      chart: chartData,

      pie: {
        dealStatus: dealStatusDistribution,
        revenueDistribution,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = { getDashboardStats };
