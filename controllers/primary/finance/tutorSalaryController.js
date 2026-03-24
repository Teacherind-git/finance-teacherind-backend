const TutorSalary = require("../../../models/primary/TutorSalary");
const TutorPayroll = require("../../../models/primary/TutorPayroll");
const TutorSalaryBreakdown = require("../../../models/primary/TutorSalaryBreakdown");
const SecondaryUser = require("../../../models/secondary/User");
const { getPaginationParams } = require("../../../utils/pagination");
const { Op } = require("sequelize");
const puppeteer = require("puppeteer");
const salarySlipTemplate = require("../../../templates/tutorSalarySlipTemplate");
const logger = require("../../../utils/logger"); // ✅ central logger

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
      whereCondition.status = "Pending";
    }

    if (
      req.user?.department === "Finance" &&
      req.user?.position === "Manager"
    ) {
      whereCondition.status = { [Op.ne]: "Pending" };
    } else {
      whereCondition.status = { [Op.ne]: "Pending" };
      whereCondition.assignedTo = req.user.id;
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

    /* ===============================
       FETCH SALARIES
    =============================== */

    const { rows: salaries, count } = await TutorSalary.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
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

    /* ===============================
       FINAL RESPONSE DATA
    =============================== */

    const finalData = salaries.map((salary) => ({
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
      user: tutorMap[salary.tutorId] || { name: "", phone: "", email: "" },
      payroll: salary.payroll
        ? {
            id: salary.payroll.id,
            totalClasses: salary.payroll.totalClasses,
            attendedClasses: salary.payroll.attendedClasses,
            missedClasses: salary.payroll.missedClasses,
            baseSalary: salary.payroll.baseSalary,
            grossSalary: salary.payroll.grossSalary,
            netSalary: salary.payroll.netSalary,
            deductions: salary.payroll.deductions || [],
            earnings: salary.payroll.earnings || [],
            totalDeductions: salary.payroll.totalDeductions,
            totalEarnings: salary.payroll.totalEarnings,
          }
        : null,
    }));

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
      include: [{ model: TutorPayroll, as: "payroll" }],
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

    const data = {
      payPeriod: "",
      payDate: salary.paidDate,
      employeeName: tutor.fullname,
      employeeId: `TUTOR-${tutor.id}`,
      position: "Tutor",
      month,
      totalClasses: salary.payroll?.totalClasses || 0,
      ratePerClass: 0,
      baseSalary: salary.payroll?.baseSalary || salary.amount,
      bonus: 0,
      lateDeduction: 0,
      leaveDeduction: 0,
      otherDeduction: 0,
      totalDeductions: 0,
      grossSalary: salary.payroll?.grossSalary || salary.amount,
      gstPercent: 0,
      gstAmount: 0,
      netPay: salary.payroll?.netSalary || salary.amount,
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
              baseSalary: salary.payroll.baseSalary,
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
      // Finance Staff sees only non-pending assigned to themselves
      whereCondition.status = { [Op.notIn]: ["Pending", "Paid"] };
      whereCondition.assignedTo = userId;
    }

    /* ===============================
       TODAY DUE
    =============================== */
    const todayDue = await TutorSalary.sum("amount", {
      where: {
        ...whereCondition,
        dueDate: today,
      },
    });

    /* ===============================
       MONTH DUE
    =============================== */
    const monthDue = await TutorSalary.sum("amount", {
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
    const totalPending = await TutorSalary.sum("amount", {
      where: {
        ...whereCondition,
        status: { [Op.ne]: "Paid" },
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
    });
  }
};
/* -----------------------------------------------------
   6. GET TUTOR SALARY BREAKDOWNS
----------------------------------------------------- */
exports.getSalaryWithBreakdown = async (req, res) => {
  try {
    const { id } = req.params;

    const salary = await TutorSalary.findOne({
      where: { id: id },
      include: [
        {
          model: TutorSalaryBreakdown,
          as: "breakdowns",
        },
      ],
    });

    res.json({ success: true, data: salary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
