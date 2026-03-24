const StaffSalary = require("../../../models/primary/StaffSalary");
const Staff = require("../../../models/primary/Staff");
const SecondaryUser = require("../../../models/secondary/User");
const { Op } = require("sequelize");
const StaffPayroll = require("../../../models/primary/StaffPayroll");
const CounselorPayroll = require("../../../models/primary/CounselorPayroll");
const { getPaginationParams } = require("../../../utils/pagination");
const puppeteer = require("puppeteer");
const salarySlipTemplate = require("../../../templates/staffSalarySlipTemplate");
const logger = require("../../../utils/logger"); // ✅ central logger

// -----------------------------------------------------
// 1. GET ALL SALARIES
// ----------------------------------------------------
exports.getAllSalaries = async (req, res) => {
  try {
    const whereCondition = { isDeleted: false };
    const { search } = req.query;

    /* ===============================
       DEPARTMENT FILTER
    =============================== */
    if (req.user?.department === "HR") {
      whereCondition.status = "Pending";
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
       SEARCH USERS FIRST
    =============================== */

    let staffSearchIds = [];
    let counselorSearchIds = [];

    if (search) {
      const searchCondition = {
        [Op.or]: [
          { fullName: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ],
      };

      const counselorSearchCondition = {
        [Op.or]: [
          { fullname: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ],
      };

      const [staffMatches, counselorMatches] = await Promise.all([
        Staff.findAll({
          where: searchCondition,
          attributes: ["id"],
          raw: true,
        }),
        SecondaryUser.findAll({
          where: counselorSearchCondition,
          attributes: ["id"],
          raw: true,
        }),
      ]);

      staffSearchIds = staffMatches.map((s) => s.id);
      counselorSearchIds = counselorMatches.map((c) => c.id);

      whereCondition[Op.or] = [
        { payrollMonth: { [Op.like]: `%${search}%` } },
        { status: { [Op.like]: `%${search}%` } },
        { staffId: { [Op.in]: staffSearchIds } },
        { counselorId: { [Op.in]: counselorSearchIds } },
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

    /* ===============================
       FETCH SALARIES
    =============================== */

    const { rows: salaries, count } = await StaffSalary.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: StaffPayroll,
          as: "staffPayroll",
          required: false,
        },
        {
          model: CounselorPayroll,
          as: "counselorPayroll",
          required: false,
        },
      ],
    });

    /* ===============================
       COLLECT USER IDS
    =============================== */

    const staffIds = new Set();
    const counselorIds = new Set();

    salaries.forEach((s) => {
      if (s.type === "STAFF" && s.staffId) staffIds.add(s.staffId);
      if (s.type === "COUNSELOR" && s.counselorId)
        counselorIds.add(s.counselorId);
    });

    /* ===============================
       FETCH USERS
    =============================== */

    const [staffList, counselorList] = await Promise.all([
      Staff.findAll({
        where: { id: [...staffIds] },
        attributes: ["id", "fullName", "phone", "email"],
        raw: true,
      }),
      SecondaryUser.findAll({
        where: { id: [...counselorIds] },
        attributes: ["id", "fullname", "phone", "email"],
        raw: true,
      }),
    ]);

    /* ===============================
       CREATE USER MAPS
    =============================== */

    const staffMap = {};
    staffList.forEach((s) => {
      staffMap[s.id] = {
        name: s.fullName,
        phone: s.phone,
        email: s.email,
      };
    });

    const counselorMap = {};
    counselorList.forEach((c) => {
      counselorMap[c.id] = {
        name: c.fullname,
        phone: c.phone,
        email: c.email,
      };
    });

    /* ===============================
       FINAL RESPONSE DATA
    =============================== */

    const finalData = salaries.map((salary) => {
      let user = { name: "", phone: "", email: "" };

      if (salary.type === "STAFF") {
        user = staffMap[salary.staffId] || user;
      }

      if (salary.type === "COUNSELOR") {
        user = counselorMap[salary.counselorId] || user;
      }

      let payroll = null;

      if (salary.type === "STAFF" && salary.staffPayroll) {
        payroll = {
          id: salary.staffPayroll.id,
          grossSalary: salary.staffPayroll.grossSalary,
          netSalary: salary.staffPayroll.netSalary,
          earnings: salary.staffPayroll.earnings || [],
          deductions: salary.staffPayroll.deductions || [],
          totalEarnings: salary.staffPayroll.totalEarnings,
          totalDeductions: salary.staffPayroll.totalDeductions,
        };
      }

      if (salary.type === "COUNSELOR" && salary.counselorPayroll) {
        payroll = {
          id: salary.counselorPayroll.id,
          grossSalary: salary.counselorPayroll.grossSalary,
          netSalary: salary.counselorPayroll.netSalary,
          earnings: salary.counselorPayroll.earnings || [],
          deductions: salary.counselorPayroll.deductions || [],
          totalEarnings: salary.counselorPayroll.totalEarnings,
          totalDeductions: salary.counselorPayroll.totalDeductions,
        };
      }

      return {
        salaryId: salary.id,
        type: salary.type,
        payrollMonth: salary.payrollMonth,
        amount: salary.amount,
        status: salary.status,
        salaryDate: salary.salaryDate,
        dueDate: salary.dueDate,
        finalDueDate: salary.finalDueDate,
        user,
        staffId: salary.staffId,
        counselorId: salary.counselorId,
        assignedTo: salary.assignedTo,
        paidDate: salary.paidDate,
        payroll,
      };
    });

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
    logger.error("GET SALARY LIST ERROR", {
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

// -----------------------------------------------------
// 2. UPDATE STATUS (Finance)
// -----------------------------------------------------
exports.updateSalaryStatus = async (req, res) => {
  try {
    const salaryId = req.params.id;
    const { status } = req.body;

    const salary = await StaffSalary.findByPk(salaryId);

    if (!salary) {
      return res.status(404).json({ message: "Salary not found" });
    }

    salary.status = status;
    salary.updatedBy = req.user?.id || null;
    if (status === "Approved") salary.approvedBy = req.user?.id || null;

    if (status === "Paid") salary.paidDate = new Date();
    if (status !== "Paid") salary.paidDate = null;

    await salary.save();

    res
      .status(200)
      .json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    logger.error("UPDATE STATUS ERROR", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Internal server error" });
  }
};

// -----------------------------------------------------
// 3. GENERATE PDF RECEIPT (Finance)
// -----------------------------------------------------
exports.downloadReceipt = async (req, res) => {
  try {
    const salaryId = req.params.id;

    const salary = await StaffSalary.findOne({
      where: { id: salaryId, isDeleted: false, status: "Paid" },
      include: [{ model: StaffPayroll, as: "staffPayroll" }],
    });

    if (!salary) {
      return res
        .status(404)
        .json({ success: false, message: "Salary record not found" });
    }

    let user = null;
    if (salary.type === "STAFF" && salary.staffId) {
      user = await Staff.findByPk(salary.staffId, {
        attributes: ["fullName", "id"],
      });
    }
    if (salary.type === "COUNSELOR" && salary.counselorId) {
      user = await SecondaryUser.findByPk(salary.counselorId, {
        attributes: ["fullname", "id"],
      });
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    const payroll = salary.staffPayroll;
    const { start, end } = getMonthStartAndEnd(payroll.payrollMonth);

    const data = {
      payPeriod: `${formatDate(start)} to ${formatDate(end)}`,
      payDate: formatDate(salary.paidDate),
      employeeName: salary.type === "STAFF" ? user.fullName : user.fullname,
      employeeId: salary.type === "STAFF" ? `EMP-${user.id}` : `CNS-${user.id}`,
      position: salary.type,
      month: payroll.payrollMonth
        ? new Date(payroll.payrollMonth).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })
        : "",
      baseSalary: payroll.baseSalary || salary.amount,
      bonus: payroll.bonus || 0,
      totalDeductions: payroll.totalDeductions || 0,
      grossSalary: payroll.grossSalary || salary.amount,
      gstPercent: payroll.gstPercent || 0,
      gstAmount: payroll.gstAmount || 0,
      netPay: salary.amount,
    };

    const html = salarySlipTemplate(data);

    const browser = await puppeteer.launch({ headless: "new" });
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
      "Content-Disposition": `attachment; filename=salary-slip-${data.employeeId}.pdf`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    logger.error("DOWNLOAD RECEIPT ERROR", {
      message: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ success: false, message: "Failed to generate salary slip" });
  }
};

// -----------------------------------------------------
// 4. ASSIGN STAFF SALARIES (Finance)
// -----------------------------------------------------
exports.assignStaffSalaries = async (req, res) => {
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

    const salaries = await StaffSalary.findAll({
      where: { id: { [Op.in]: salaryIds }, assignedTo: null },
    });

    if (!salaries.length) {
      return res
        .status(400)
        .json({ message: "No eligible staff salaries found for assignment" });
    }

    await StaffSalary.update(
      { assignedTo, assignDate: new Date(), updatedBy: req.user?.id || null },
      { where: { id: { [Op.in]: salaries.map((s) => s.id) } } },
    );

    res.status(200).json({
      success: true,
      message: `${salaries.length} staff salaries assigned successfully`,
      assignedCount: salaries.length,
    });
  } catch (error) {
    logger.error("BULK ASSIGN STAFF SALARIES ERROR", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -----------------------------------------------------
// 5. GET NON ASSIGNED STAFF SALARIES
// -----------------------------------------------------
exports.getNonAssignedStaffSalaries = async (req, res) => {
  try {
    const { minAmount, maxAmount, fromDate, toDate } = req.query;

    const whereCondition = { isDeleted: false, assignedTo: null };
    whereCondition.status = { [Op.ne]: "Pending" };

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

    const salaries = await StaffSalary.findAll({
      where: whereCondition,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: StaffPayroll,
          as: "staffPayroll",
          required: false, // important because counselor salaries exist
        },
      ],
    });

    const finalData = [];

    for (let salary of salaries) {
      let staffDetails = null;
      if (salary.type === "STAFF" && salary.staffId) {
        const staff = await Staff.findOne({
          where: { id: salary.staffId },
          attributes: ["fullName", "phone", "email"],
        });
        staffDetails = staff
          ? { name: staff.fullName, phone: staff.phone, email: staff.email }
          : null;
      } else if (salary.type === "COUNSELOR" && salary.counselorId) {
        const counselor = await SecondaryUser.findOne({
          where: { id: salary.counselorId },
          attributes: ["fullname", "phone", "email"],
        });
        staffDetails = counselor
          ? {
              name: counselor.fullname,
              phone: counselor.phone,
              email: counselor.email,
            }
          : null;
      }

      finalData.push({
        salaryId: salary.id,
        payrollMonth: salary.payrollMonth,
        amount: salary.amount,
        status: salary.status,
        createdAt: salary.createdAt,
        assignedTo: salary.assignedTo,
        staffId: salary.staffId,
        salaryDate: salary.salaryDate,
        dueDate: salary.dueDate,
        finalDueDate: salary.finalDueDate,
        user: staffDetails || { name: "", phone: "", email: "" },
        payroll: salary.payroll
          ? {
              baseSalary: salary.payroll.baseSalary,
              grossSalary: salary.payroll.grossSalary,
              netSalary: salary.payroll.netSalary,
              totalWorkingDays: salary.payroll.totalWorkingDays,
              attendedDays: salary.payroll.attendedDays,
              missedDays: salary.payroll.missedDays,
            }
          : null,
      });
    }

    return res
      .status(200)
      .json({ success: true, count: finalData.length, data: finalData });
  } catch (error) {
    logger.error("GET NON ASSIGNED STAFF SALARY ERROR", {
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

/* ---------------- HELPERS ---------------- */
const getMonthStartAndEnd = (date) => {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const formatDate = (date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
// -----------------------------------------------------
// 6. GET STAFF SALARY SUMMARY
// -----------------------------------------------------
exports.getStaffSalarySummary = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const whereCondition = { isDeleted: false };

    const { roleId, department, position, id: userId } = req.user;

    /* ===============================
       ROLE / DEPARTMENT BASED FILTER
    =============================== */

    if (department === "HR" && roleId === 3) {
      // HR Manager sees only pending
      whereCondition.status = "Pending";
    } else if (department === "Finance" && position === "Manager") {
      // Finance Manager sees all non-pending
      whereCondition.status = { [Op.notIn]: ["Pending", "Paid"] };
    } else if (department === "Finance" && position !== "Manager") {
      // Finance Staff sees only non-pending salaries assigned to themselves
      whereCondition.status = { [Op.notIn]: ["Pending", "Paid"] };
      whereCondition.assignedTo = userId;
    }

    /* ===============================
       TODAY DUE
    =============================== */
    const todayDue = await StaffSalary.sum("amount", {
      where: {
        ...whereCondition,
        dueDate: today,
      },
    });

    /* ===============================
       MONTH DUE
    =============================== */
    const monthDue = await StaffSalary.sum("amount", {
      where: {
        ...whereCondition,
        dueDate: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
    });

    /* ===============================
       TOTAL PENDING
    =============================== */
    const totalPending = await StaffSalary.sum("amount", {
      where: {
        ...whereCondition,
        status: { [Op.ne]: "Paid" },
      },
    });

    /* ===============================
       TOTAL PAID
    =============================== */
    const totalPaid = await StaffSalary.sum("amount", {
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
    logger.error("GET STAFF SALARY SUMMARY ERROR", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch salary summary",
    });
  }
};
