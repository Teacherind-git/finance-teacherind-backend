const { Op } = require("sequelize");
const Student = require("../../../models/primary/Student");
const StudentBill = require("../../../models/primary/StudentBill");

// ✅ Date Range Helper
const getDateRange = (filter) => {
  const now = new Date();
  let startDate, endDate;

  switch (filter) {
    case "today": {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case "week": {
      const current = new Date();
      const day = current.getDay();

      startDate = new Date(current);
      startDate.setDate(current.getDate() - day);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case "year": {
      const year = now.getFullYear();

      startDate = new Date(year, 0, 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(year, 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    }

    case "month":
    default: {
      const year = now.getFullYear();
      const month = now.getMonth();

      startDate = new Date(year, month, 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(year, month + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
  }

  return { startDate, endDate };
};

// ✅ Controller
const getDashboardStats = async (req, res) => {
  try {
    const filter = req.query.filter || "month";
    const { startDate, endDate } = getDateRange(filter);

    // Common filters
    const studentFilter = {
      isDeleted: false,
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    const billFilter = {
      isDeleted: false,
      billDate: {
        [Op.between]: [startDate, endDate],
      },
    };

    // 🔹 Parallel queries (faster 🚀)
    const [
      totalLeads,
      websiteJoining,
      metaJoining,
      demoCount,
      convertedCount,
      discardedCount,
      referralCount,
      totalRevenue,
      pendingPayments
    ] = await Promise.all([
      // Total Leads
      Student.count({
        where: studentFilter,
      }),

      // Website Joining
      Student.count({
        where: { ...studentFilter, source: "website" },
      }),

      // Meta Joining
      Student.count({
        where: { ...studentFilter, source: "meta" },
      }),

      // Referral Joining (COUNT ✅)
      Student.count({
        where: { ...studentFilter, source: "referral" },
      }),

      // Demo Count ✅
      Student.count({
        where: { ...studentFilter, status: "Demo" },
      }),

      // Converted Count ✅
      Student.count({
        where: { ...studentFilter, status: "Converted" },
      }),

      // Discarded Count
      Student.count({
        where: { ...studentFilter, status: "Discarded" },
      }),

      // Total Revenue (Paid)
      StudentBill.sum("amount", {
        where: { ...billFilter, status: "Paid" },
      }),

      // Pending Payments
      StudentBill.sum("amount", {
        where: {
          ...billFilter,
          status: { [Op.ne]: "Paid" },
        },
      }),
    ]);
    return res.status(200).json({
      filter,
      startDate,
      endDate,

      totalLeads: totalLeads || 0,
      websiteJoining: websiteJoining || 0,
      metaJoining: metaJoining || 0,

      referrals: referralCount || 0,
      converted: convertedCount || 0,
      demo: demoCount || 0,

      discarded: discardedCount || 0,

      totalRevenue: totalRevenue || 0,
      paymentsPending: pendingPayments || 0,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = { getDashboardStats };
