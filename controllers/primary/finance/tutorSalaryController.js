const TutorSalary = require("../../../models/primary/TutorSalary");
const Tutor = require("../../../models/primary/Tutor");
const TutorPayroll = require("../../../models/primary/TutorPayroll");
const TutorSalaryBreakdown = require("../../../models/primary/TutorSalaryBreakdown");
const SecondaryUser = require("../../../models/secondary/User");
const ClassSchedule = require("../../../models/secondary/ClassSchedule");
const { getPaginationParams } = require("../../../utils/pagination");
const { Op, Sequelize } = require("sequelize");
const puppeteer = require("puppeteer");
const salarySlipTemplate = require("../../../templates/tutorSalarySlipTemplate");
const logger = require("../../../utils/logger"); // ✅ central logger
const { parseList } = require("../../../utils/arrayFunction");
const { fn, col, literal } = require("sequelize");

/* -----------------------------------------------------
   HELPERS: current payroll cycle vs. historical months
   -----------------------------------------------------
   The monthly cron writes one payroll snapshot per tutor for
   "last month" relative to whenever it ran. That snapshot is trusted
   as-is for the current cycle. For any older month we recompute the
   scheduled/attended class counts live from the secondary DB instead
   of trusting the primary DB's stored snapshot, since a single
   payroll row can end up referenced by more than one salary month
   (legacy data / concurrent edits) and would otherwise show stale or
   duplicated figures for past months.
----------------------------------------------------- */
function isCurrentPayrollCycle(payrollMonth) {
  if (!payrollMonth) return false;

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const d = new Date(payrollMonth);

  return (
    d.getFullYear() === lastMonth.getFullYear() &&
    d.getMonth() === lastMonth.getMonth()
  );
}

async function getLiveScheduleStats(tutorId, payrollMonth) {
  const d = new Date(payrollMonth);
  const startDate = new Date(d.getFullYear(), d.getMonth(), 1);
  const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const schedules = await ClassSchedule.findAll({
    where: {
      tutor: tutorId,
      start: { [Op.between]: [startDate, endDate] },
    },
    attributes: ["id", "status"],
  });

  return {
    totalClasses: schedules.length,
    attendedClasses: schedules.filter((s) => s.status === 2).length,
  };
}

/* -----------------------------------------------------
   1. GET ALL TUTOR SALARIES
----------------------------------------------------- */
exports.getAllTutorSalaries = async (req, res) => {
  try {
    const whereCondition = { isDeleted: false };
    const { search } = req.query;

    /* ===============================
       DEPARTMENT FILTER
    =============================== */

    if (req.user?.department === "HR") {
      // HR: no filter → see everything
      // so DO NOT set whereCondition.status at all whereCondition.status = "Pending";
    } else if (
      req.user?.department === "Finance" &&
      req.user?.position === "Manager"
    ) {
      whereCondition.status = { [Op.ne]: "Pending" };
    } else {
      whereCondition.status = { [Op.ne]: "Pending" };
      whereCondition.assignedTo = req.user.id;
    }

    /* ===============================
   PAYROLL MONTH DATE RANGE FILTER
=============================== */

    const { startMonth, endMonth } = req.query;

    if (startMonth || endMonth) {
      const dateRange = {};

      // Start of selected month
      if (startMonth) {
        dateRange[Op.gte] = new Date(`${startMonth}-01T00:00:00`);
      }

      // End of selected month
      if (endMonth) {
        const endDate = new Date(`${endMonth}-01T00:00:00`);
        endDate.setMonth(endDate.getMonth() + 1); // go to next month
        endDate.setDate(0); // step back → last day of month
        endDate.setHours(23, 59, 59, 999); // full day end

        dateRange[Op.lte] = endDate;
      }

      whereCondition.payrollMonth = dateRange;
    }

    /* ===============================
       SEARCH TUTORS
    =============================== */

    let tutorSearchIds = [];

    if (search) {
      const tutorSearchCondition = {
        [Op.or]: [
          { fullname: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ],
      };

      const tutors = await SecondaryUser.findAll({
        where: tutorSearchCondition,
        attributes: ["id"],
        raw: true,
      });

      tutorSearchIds = tutors.map((t) => t.id);

      whereCondition[Op.or] = [
        { payrollMonth: { [Op.like]: `%${search}%` } },
        { status: { [Op.like]: `%${search}%` } },
        { tutorId: { [Op.in]: tutorSearchIds } },
      ];
    }

    /* ===============================
       PAGINATION
    =============================== */

    const { page, limit, offset, sortBy, sortOrder } = getPaginationParams(
      req,
      [
        "salaryDate",
        "payrollMonth",
        "amount",
        "status",
        "dueDate",
        "finalDueDate",
        "createdAt",
      ],
    );

    let orderCondition = [[sortBy, sortOrder]];

    if (sortBy === "status") {
      orderCondition = [
        [
          Sequelize.literal(`
        CASE 
          WHEN status = 'Approved' THEN 1
          WHEN status = 'Pending' THEN 2
          WHEN status = 'Paid' THEN 3
          WHEN status = 'Rejected' THEN 4
          ELSE 5
        END
      `),
          "ASC",
        ],
      ];
    }

    /* ===============================
       FETCH SALARIES
    =============================== */

    const { rows: salaries, count } = await TutorSalary.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: orderCondition,
      include: [{ model: TutorPayroll, as: "payroll" }],
    });

    /* ===============================
       COLLECT TUTOR IDS
    =============================== */

    const tutorIds = salaries.map((s) => s.tutorId).filter(Boolean);

    /* ===============================
       FETCH TUTORS
    =============================== */

    const tutors = await SecondaryUser.findAll({
      where: { id: tutorIds },
      attributes: ["id", "fullname", "phone", "email"],
      raw: true,
    });

    /* ===============================
       CREATE MAP
    =============================== */

    const tutorMap = {};
    tutors.forEach((t) => {
      tutorMap[t.id] = {
        name: t.fullname,
        phone: t.phone,
        email: t.email,
      };
    });

    const tutorEmails = [
      ...new Set(tutors.map((s) => s.email).filter(Boolean)),
    ];

    const tutorDetails = await Tutor.findAll({
      where: {
        email: {
          [Op.in]: tutorEmails,
        },
      },

      attributes: ["email", "bankDetails"],

      raw: true,
    });

    const accountMap = {};

    tutorDetails.forEach((t) => {
      let bankDetails = t.bankDetails;

      // Normalize JSON string → object
      if (typeof bankDetails === "string") {
        try {
          bankDetails = JSON.parse(bankDetails);
        } catch (err) {
          bankDetails = {};
        }
      }

      accountMap[t.email] = {
        accountNo: bankDetails?.accountNo || "",
        bankName: bankDetails?.bank || "",
        ifscCode: bankDetails?.ifsc || "",
        upiId: bankDetails?.upi || "",
      };
    });

    /* ===============================
       FINAL RESPONSE DATA
    =============================== */

    const finalData = await Promise.all(
      salaries.map(async (salary) => {
        const tutorEmail = tutorMap[salary.tutorId]?.email;

        // Current payroll cycle → trust the primary DB snapshot as-is.
        // Older months → re-derive scheduled/attended counts live from
        // the secondary DB so they can't show stale/shared numbers.
        let totalClasses = salary.payroll?.totalClasses;
        let attendedClasses = salary.payroll?.attendedClasses;

        if (salary.payroll && !isCurrentPayrollCycle(salary.payrollMonth)) {
          try {
            const live = await getLiveScheduleStats(
              salary.tutorId,
              salary.payrollMonth,
            );
            totalClasses = live.totalClasses;
            attendedClasses = live.attendedClasses;
          } catch (err) {
            logger.error("Failed to fetch live schedule stats", {
              tutorId: salary.tutorId,
              payrollMonth: salary.payrollMonth,
              message: err.message,
            });
          }
        }

        return {
          salaryId: salary.id,
          type: "TUTOR",
          payrollMonth: salary.payrollMonth,
          amount: salary.amount,
          status: salary.status,
          salaryDate: salary.salaryDate,
          dueDate: salary.dueDate,
          finalDueDate: salary.finalDueDate,
          assignedTo: salary.assignedTo,
          paidDate: salary.paidDate,
          tutorId: salary.tutorId,

          user: {
            ...(tutorMap[salary.tutorId] || {
              name: "",
              phone: "",
              email: "",
            }),

            accountNo: accountMap[tutorEmail]?.accountNo || "",
            bankName: accountMap[tutorEmail]?.bankName || "",
            ifscCode: accountMap[tutorEmail]?.ifscCode || "",
            upiId: accountMap[tutorEmail]?.upiId || "",
          },

          payroll: salary.payroll
            ? {
                id: salary.payroll.id,
                totalClasses,
                attendedClasses,
                missedClasses: salary.payroll.missedClasses,
                grossSalary: salary.payroll.grossSalary,
                netSalary: salary.payroll.netSalary,

                deductions: parseList(salary.payroll.deductions),
                earnings: parseList(salary.payroll.earnings),

                totalDeductions: salary.payroll.totalDeductions,
                totalEarnings: salary.payroll.totalEarnings,
              }
            : null,
        };
      }),
    );

    /* ===============================
       RESPONSE
    =============================== */

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        totalRecords: count,
        totalPages: Math.ceil(count / limit),
      },
      data: finalData,
    });
  } catch (error) {
    logger.error("GET TUTOR SALARY LIST ERROR", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
/* -----------------------------------------------------
   2. UPDATE SALARY STATUS (Finance)
----------------------------------------------------- */
exports.updateTutorSalaryStatus = async (req, res) => {
  try {
    const salaryId = req.params.id;
    const { status } = req.body;

    const salary = await TutorSalary.findByPk(salaryId);

    if (!salary) {
      return res.status(404).json({ message: "Tutor salary not found" });
    }

    salary.status = status;
    salary.updatedBy = req.user?.id || null;

    if (status === "Approved") salary.approvedBy = req.user?.id || null;

    if (status === "Paid") salary.paidDate = new Date();
    if (status !== "Paid") salary.paidDate = null;

    await salary.save();

    res
      .status(200)
      .json({ success: true, message: "Tutor salary status updated" });
  } catch (error) {
    logger.error("UPDATE TUTOR SALARY STATUS ERROR", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Internal server error" });
  }
};

/* -----------------------------------------------------
   3. GENERATE / DOWNLOAD SALARY RECEIPT (Finance)
----------------------------------------------------- */
exports.downloadReceipt = async (req, res) => {
  try {
    const salaryId = req.params.id;

    const salary = await TutorSalary.findOne({
      where: { id: salaryId, isDeleted: false, status: "Paid" },
      include: [
        {
          model: TutorPayroll,
          as: "payroll",
        },
        {
          model: TutorSalaryBreakdown,
          as: "breakdowns",
        },
      ],
    });

    if (!salary) {
      return res
        .status(404)
        .json({ success: false, message: "Tutor salary not found" });
    }

    const tutor = await SecondaryUser.findByPk(salary.tutorId, {
      attributes: ["id", "fullname"],
    });

    if (!tutor) {
      return res
        .status(404)
        .json({ success: false, message: "Tutor not found" });
    }

    const month = salary.payrollMonth
      ? new Date(salary.payrollMonth).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })
      : "";
    // Earnings rows dynamic
    const earningsArr = Array.isArray(salary.payroll?.earnings)
      ? salary.payroll.earnings
      : typeof salary.payroll?.earnings === "string"
        ? JSON.parse(salary.payroll.earnings || "[]")
        : [];
    const earningsHtml = earningsArr
      .map((e) => {
        return `
      <tr>
        <td>
          ${e.type}
          ${
            e.description
              ? ` <span style="color:#666;">(${e.description})</span>`
              : ""
          }
        </td>
        <td class="right">${e.amount}</td>
        <td></td>
        <td></td>
      </tr>`;
      })
      .join("");

    // Deductions rows dynamic
    const deductionsArr = Array.isArray(salary.payroll?.deductions)
      ? salary.payroll.deductions
      : typeof salary.payroll?.deductions === "string"
        ? JSON.parse(salary.payroll.deductions || "[]")
        : [];

    const deductionsHtml = deductionsArr
      .map((d) => {
        return `
      <tr>
        <td></td>
        <td></td>
        <td>
          ${d.type}
          ${
            d.description
              ? ` <span style="color:#666;">(${d.description})</span>`
              : ""
          }
        </td>
        <td class="right">${d.amount}</td>
      </tr>`;
      })
      .join("");

    // Group breakdown by class + syllabus
    const breakdownGroups = {};

    salary.breakdowns.forEach((row) => {
      const key = `${row.classNumber}-${row.syllabusName}`;

      if (!breakdownGroups[key]) {
        breakdownGroups[key] = {
          classNumber: row.classNumber,
          syllabusName: row.syllabusName,
          basePay: row.basePay,
          count: 0,
          totalBasePay: 0,
        };
      }

      breakdownGroups[key].count += 1;
      breakdownGroups[key].totalBasePay += row.amount;
    });

    // Convert grouped result into HTML strings
    const breakdownHtml = Object.values(breakdownGroups)
      .map((b) => {
        return `
      <tr>
        <td>${b.classNumber}</td>
        <td>${b.syllabusName}</td>
        <td class="right">${b.count}</td>
        <td class="right">${b.basePay}</td>
        <td class="right">${b.totalBasePay}</td>
      </tr>
    `;
      })
      .join("");

    const data = {
      payPeriod: "",
      payDate: salary.paidDate,
      employeeName: tutor.fullname,
      employeeId: `TUTOR-${tutor.id}`,
      position: "Tutor",
      month,
      totalClasses: salary.payroll?.attendedClasses || 0,
      totalDeductions: salary.payroll?.totalDeductions,
      totalEarnings: salary.totalEarnings,
      grossSalary: salary.payroll?.grossSalary || salary.amount,
      basePay: salary.payroll?.baseSalary,
      gstPercent: 0,
      gstAmount: 0,
      netPay: salary.payroll?.netSalary || salary.amount,
      earningsHtml,
      deductionsHtml,
      breakdownHtml,
    };

    const html = salarySlipTemplate(data);

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px" },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=tutor-salary-slip-${tutor.id}.pdf`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    logger.error("DOWNLOAD TUTOR RECEIPT ERROR", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to generate tutor salary slip",
    });
  }
};

/* -----------------------------------------------------
   4. UPDATE ASSIGNED_TO STATUS (Finance)
----------------------------------------------------- */
exports.assignTutorSalaries = async (req, res) => {
  try {
    const { salaryIds, assignedTo } = req.body;

    if (!Array.isArray(salaryIds) || !salaryIds.length) {
      return res
        .status(400)
        .json({ message: "salaryIds must be a non-empty array" });
    }
    if (!assignedTo) {
      return res.status(400).json({ message: "assignId is required" });
    }

    const salaries = await TutorSalary.findAll({
      where: { id: { [Op.in]: salaryIds }, assignedTo: null },
    });

    if (!salaries.length) {
      return res
        .status(400)
        .json({ message: "No eligible tutor salaries found for assignment" });
    }

    await TutorSalary.update(
      { assignedTo, assignDate: new Date(), updatedBy: req.user?.id || null },
      { where: { id: { [Op.in]: salaries.map((s) => s.id) } } },
    );

    return res.status(200).json({
      success: true,
      message: `${salaries.length} tutor salaries assigned successfully`,
      assignedCount: salaries.length,
    });
  } catch (error) {
    logger.error("BULK ASSIGN TUTOR SALARIES ERROR", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* -----------------------------------------------------
   5. GET ALL NON ASSIGNED TUTOR SALARIES
----------------------------------------------------- */
exports.getNonAssignedTutorSalaries = async (req, res) => {
  try {
    const { minAmount, maxAmount, fromDate, toDate } = req.query;

    const whereCondition = { isDeleted: false, assignedTo: null };
    whereCondition.status = { [Op.notIn]: ["Pending", "Paid"] };

    if (minAmount || maxAmount) {
      whereCondition.amount = {};
      if (minAmount) whereCondition.amount[Op.gte] = Number(minAmount);
      if (maxAmount) whereCondition.amount[Op.lte] = Number(maxAmount);
    }

    if (fromDate || toDate) {
      whereCondition.createdAt = {};
      if (fromDate) whereCondition.createdAt[Op.gte] = new Date(fromDate);
      if (toDate) whereCondition.createdAt[Op.lte] = new Date(toDate);
    }

    const salaries = await TutorSalary.findAll({
      where: whereCondition,
      order: [["createdAt", "DESC"]],
      include: [{ model: TutorPayroll, as: "payroll" }],
    });

    const finalData = [];

    for (let salary of salaries) {
      let tutorDetails = null;

      if (salary.tutorId) {
        const tutor = await SecondaryUser.findOne({
          where: { id: salary.tutorId },
          attributes: ["fullname", "phone", "email"],
        });

        tutorDetails = tutor
          ? { name: tutor.fullname, phone: tutor.phone, email: tutor.email }
          : null;
      }

      finalData.push({
        salaryId: salary.id,
        payrollMonth: salary.payrollMonth,
        amount: salary.amount,
        status: salary.status,
        createdAt: salary.createdAt,
        assignedTo: salary.assignedTo,
        tutorId: salary.tutorId,
        salaryDate: salary.salaryDate,
        dueDate: salary.dueDate,
        finalDueDate: salary.finalDueDate,
        user: tutorDetails || { name: "", phone: "", email: "" },
        payroll: salary.payroll
          ? {
              totalClasses: salary.payroll.totalClasses,
              attendedClasses: salary.payroll.attendedClasses,
              missedClasses: salary.payroll.missedClasses,
              grossSalary: salary.payroll.grossSalary,
              grossSalary: salary.payroll.grossSalary,
              netSalary: salary.payroll.netSalary,
            }
          : null,
      });
    }

    return res
      .status(200)
      .json({ success: true, count: finalData.length, data: finalData });
  } catch (error) {
    logger.error("GET ASSIGNED TUTOR SALARY ERROR", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
/* -----------------------------------------------------
   6. GET TUTOR SALARY SUMMARY
----------------------------------------------------- */
exports.getTutorSalarySummary = async (req, res) => {
  try {
    const whereCondition = { isDeleted: false };

    const { search, startMonth, endMonth } = req.query;

    /* ===============================
       ROLE / DEPARTMENT FILTER
    =============================== */

    if (req.user?.department === "HR") {
      // HR sees everything
    } else if (
      req.user?.department === "Finance" &&
      req.user?.position === "Manager"
    ) {
      whereCondition.status = { [Op.ne]: "Pending" };
    } else {
      whereCondition.status = { [Op.ne]: "Pending" };
      whereCondition.assignedTo = req.user.id;
    }

    /* ===============================
       PAYROLL MONTH DATE RANGE FILTER
    =============================== */

    if (startMonth || endMonth) {
      const dateRange = {};

      // Start month
      if (startMonth) {
        dateRange[Op.gte] = new Date(`${startMonth}-01T00:00:00`);
      }

      // End month
      if (endMonth) {
        const endDate = new Date(`${endMonth}-01T00:00:00`);

        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);

        dateRange[Op.lte] = endDate;
      }

      whereCondition.payrollMonth = dateRange;
    }

    /* ===============================
       SEARCH FILTER
    =============================== */

    if (search) {
      let tutorSearchIds = [];

      const tutorSearchCondition = {
        [Op.or]: [
          { fullname: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ],
      };

      const tutors = await SecondaryUser.findAll({
        where: tutorSearchCondition,
        attributes: ["id"],
        raw: true,
      });

      tutorSearchIds = tutors.map((t) => t.id);

      whereCondition[Op.or] = [
        { payrollMonth: { [Op.like]: `%${search}%` } },
        { status: { [Op.like]: `%${search}%` } },
        { tutorId: { [Op.in]: tutorSearchIds } },
      ];
    }

    /* ===============================
       TODAY RANGE
    =============================== */

    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    /* ===============================
       TODAY DUE
    =============================== */

    const todayDue = await TutorSalary.sum("amount", {
      where: {
        ...whereCondition,
        dueDate: {
          [Op.between]: [startToday, endToday],
        },
      },
    });

    /* ===============================
       MONTH / FILTERED DUE
    =============================== */

    const monthDue = await TutorSalary.sum("amount", {
      where: {
        ...whereCondition,
        status: {
          [Op.notIn]: ["Paid", "Rejected"],
        },
      },
    });

    /* ===============================
       TOTAL PENDING
    =============================== */

    const totalPending = await TutorSalary.sum("amount", {
      where: {
        ...whereCondition,
        status: { [Op.eq]: "Pending" },
      },
    });

    /* ===============================
       TOTAL PAID
    =============================== */

    const totalPaid = await TutorSalary.sum("amount", {
      where: {
        ...whereCondition,
        status: "Paid",
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        todayDue: todayDue || 0,
        monthDue: monthDue || 0,
        totalPending: totalPending || 0,
        totalPaid: totalPaid || 0,
      },
    });
  } catch (error) {
    logger.error("GET TUTOR SALARY SUMMARY ERROR", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tutor salary summary",
      error: error.message,
    });
  }
};
/* -----------------------------------------------------
   6. GET TUTOR SALARY BREAKDOWNS
----------------------------------------------------- */

exports.getSalaryBreakdowns = async (req, res) => {
  try {
    const { id } = req.params;

    const breakdowns = await TutorSalaryBreakdown.findAll({
      where: {
        salaryId: id,
        isDeleted: false,
      },

      attributes: [
        // unique frontend key
        [fn("MIN", col("id")), "id"],

        "classNumber",
        "syllabusName",
        "studentName",
        "duration",
        "basePay",

        [fn("SUM", col("classUnits")), "classUnits"],
        [fn("SUM", col("amount")), "amount"],
      ],

      group: [
        "classNumber",
        "syllabusName",
        "studentName",
        "duration",
        "basePay",
      ],

      order: [
        ["classNumber", "ASC"],
        ["studentName", "ASC"],
      ],

      raw: true,
    });

    res.json({
      success: true,
      data: breakdowns,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
