const axios = require("axios");
const moment = require("moment");
const puppeteer = require("puppeteer");
const { toWords } = require("number-to-words");
const { Op } = require("sequelize");
const SecondaryUser = require("../../../models/secondary/User");
const SecondaryStudentBill = require("../../../models/primary/SecondaryStudentBill");
const logger = require("../../../utils/logger");
const invoiceTemplate = require("../../../templates/invoiceTemplate");
const receiptTemplate = require("../../../templates/billReceiptTemplate");
const { getPaginationParams } = require("../../../utils/pagination");
const {
  getActivePackages,
  buildBreakdown,
} = require("../../../utils/secondaryBilling");

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

async function generateInvoiceId() {
  const prefix = `SINV-${moment().format("YYYY-MM")}`;

  const lastBill = await SecondaryStudentBill.findOne({
    where: { invoiceId: { [Op.like]: `${prefix}-%` } },
    order: [["createdAt", "DESC"]],
  });

  let nextNumber = 1;
  if (lastBill?.invoiceId) {
    const lastNumber = parseInt(lastBill.invoiceId.split("-")[3], 10);
    if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}

/* ================= GENERATE BILL FOR SECONDARY STUDENT ================= */
exports.generateBill = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await SecondaryUser.findOne({
      where: { id, role: 4 },
      attributes: ["id", "fullname"],
      raw: true,
    });

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const billingMonth = moment().format("YYYY-MM");

    const existingBill = await SecondaryStudentBill.findOne({
      where: {
        secondaryStudentId: id,
        billingMonth,
        isDeleted: false,
        status: { [Op.in]: ["Generated", "Due", "Partially Paid"] },
      },
    });

    if (existingBill) {
      return res.status(409).json({
        success: false,
        message: "Bill already generated for this month",
      });
    }

    let subjects;
    try {
      const { data } = await axios.post(
        "https://ai.teacherind.com/api/student-subject-details",
        { student_id: id },
      );
      subjects = data?.data?.subjects || [];
    } catch (apiError) {
      logger.error("Failed to fetch subject details for billing", {
        studentId: id,
        error: apiError.response?.data || apiError.message,
      });
      return res.status(502).json({
        success: false,
        message: "Failed to fetch subject details",
      });
    }

    const packages = await getActivePackages();

    if (!packages.length) {
      return res.status(500).json({
        success: false,
        message: "No active package found to calculate rate",
      });
    }

    const {
      breakdown,
      totalClasses,
      examFee,
      totalAmount,
      perClassRate,
      primaryPackage,
    } = buildBreakdown(subjects, packages);

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "No billable classes found for this student",
      });
    }

    const invoiceId = await generateInvoiceId();
    const billDate = moment().toDate();
    const dueDate = moment().endOf("month").toDate();

    const bill = await SecondaryStudentBill.create({
      secondaryStudentId: id,
      studentName: student.fullname,
      invoiceId,
      billingMonth,
      classesScheduled: totalClasses,
      perClassRate,
      packageId: primaryPackage?.id || null,
      breakdown: {
        subjects: breakdown,
        examFee,
        packageName: primaryPackage?.name || null,
      },
      amount: totalAmount,
      billDate,
      dueDate,
      status: "Generated",
      dueAmount: totalAmount,
      createdBy: req.user?.id || null,
      updatedBy: req.user?.id || null,
    });

    logger.info("Secondary student bill generated", {
      studentId: id,
      billId: bill.id,
      invoiceId,
      amount: totalAmount,
    });

    res.status(201).json({ success: true, data: bill });
  } catch (error) {
    logger.error("Error generating secondary student bill", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate bill" });
  }
};

/* ================= GET BILLS FOR SECONDARY STUDENT ================= */
exports.getBills = async (req, res) => {
  try {
    const { id } = req.params;

    const { page, limit, offset, sortBy, sortOrder } = getPaginationParams(
      req,
      ["createdAt", "billDate", "amount", "status"],
      "createdAt",
    );

    const { rows, count } = await SecondaryStudentBill.findAndCountAll({
      where: { secondaryStudentId: id, isDeleted: false },
      limit,
      offset,
      order: [[sortBy, sortOrder]],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        totalRecords: count,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    logger.error("Error fetching secondary student bills", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bills" });
  }
};

/* ================= GET ALL SECONDARY STUDENT BILLS (across students) ================= */
exports.getAllBills = async (req, res) => {
  try {
    const { search, status } = req.query;

    const { page, limit, offset, sortBy, sortOrder } = getPaginationParams(
      req,
      ["createdAt", "billDate", "amount", "status"],
      "createdAt",
    );

    const where = { isDeleted: false };
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { studentName: { [Op.like]: `%${search}%` } },
        { invoiceId: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await SecondaryStudentBill.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        totalRecords: count,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    logger.error("Error fetching all secondary student bills", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bills" });
  }
};

/* ================= MARK SECONDARY STUDENT BILL PAID ================= */
exports.markBillPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMode, paidAmount, dueAmount } = req.body;

    const bill = await SecondaryStudentBill.findOne({
      where: { id, isDeleted: false },
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    if (dueAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Due amount cannot be negative",
      });
    }

    const status = dueAmount === 0 ? "Paid" : "Partially Paid";

    const lastPayment = await SecondaryStudentBill.findOne({
      where: { paymentNumber: { [Op.ne]: null } },
      order: [["id", "DESC"]],
    });

    let nextNumber = 1;
    if (lastPayment?.paymentNumber) {
      const lastNum = parseInt(lastPayment.paymentNumber.split("-")[1], 10);
      if (!isNaN(lastNum)) nextNumber = lastNum + 1;
    }

    const paymentNumber = `SPAY-${String(nextNumber).padStart(5, "0")}`;
    const paidAt = new Date();

    await bill.update({
      status,
      paymentMode,
      paymentNumber,
      paymentDate: paidAt,
      paidAmount,
      dueAmount,
      updatedBy: req.user?.id || null,
    });

    res.status(200).json({
      success: true,
      message: `Bill marked as ${status} successfully`,
      data: { paymentNumber, paidAt, status },
    });
  } catch (error) {
    logger.error("Mark Secondary Student Bill Paid Error", error);
    res.status(500).json({
      success: false,
      message: "Failed to update bill status",
    });
  }
};

/* ================= SECONDARY STUDENT BILLS SUMMARY ================= */
exports.getBillsSummary = async (req, res) => {
  try {
    const baseWhere = {
      isDeleted: false,
      status: { [Op.in]: ["Generated", "Due", "Overdue", "Partially Paid"] },
    };

    const paidWhere = { isDeleted: false, status: "Paid" };

    const todayStart = moment().startOf("day").toDate();
    const todayEnd = moment().endOf("day").toDate();

    const weekStart = moment().startOf("week").toDate();
    const weekEnd = moment().endOf("week").toDate();

    const [
      totalCount,
      totalAmount,
      paidCount,
      paidAmount,
      todayCount,
      todayAmount,
      weekCount,
      weekAmount,
    ] = await Promise.all([
      SecondaryStudentBill.count({ where: baseWhere }),
      SecondaryStudentBill.sum("dueAmount", { where: baseWhere }),

      SecondaryStudentBill.count({ where: paidWhere }),
      SecondaryStudentBill.sum("amount", { where: paidWhere }),

      SecondaryStudentBill.count({
        where: { ...baseWhere, dueDate: { [Op.between]: [todayStart, todayEnd] } },
      }),
      SecondaryStudentBill.sum("dueAmount", {
        where: { ...baseWhere, dueDate: { [Op.between]: [todayStart, todayEnd] } },
      }),

      SecondaryStudentBill.count({
        where: { ...baseWhere, dueDate: { [Op.between]: [weekStart, weekEnd] } },
      }),
      SecondaryStudentBill.sum("dueAmount", {
        where: { ...baseWhere, dueDate: { [Op.between]: [weekStart, weekEnd] } },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: {
          pending: { count: totalCount, amount: totalAmount || 0 },
          paid: { count: paidCount, amount: paidAmount || 0 },
        },
        today: { count: todayCount, amount: todayAmount || 0 },
        week: { count: weekCount, amount: weekAmount || 0 },
      },
    });
  } catch (error) {
    logger.error("Get Secondary Student Bills Summary Error", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch secondary student bills summary",
    });
  }
};

/* ================= BUILD INVOICE DATA FROM BREAKDOWN ================= */
const getSecondaryInvoiceData = async (secondaryStudentId) => {
  const bill = await SecondaryStudentBill.findOne({
    where: { secondaryStudentId, isDeleted: false },
    order: [["billDate", "DESC"]],
  });

  if (!bill) return null;

  const subjects = bill.breakdown?.subjects || [];
  const examFee = bill.breakdown?.examFee;

  const items = subjects.map((s) => {
    const totalUnits = s.classesScheduled + s.extraClasses;
    const description = s.extraClasses
      ? `${s.classesScheduled} classes + ${s.extraClasses} extra classes (${s.packageName})`
      : `${s.classesScheduled} classes (${s.packageName})`;

    return {
      name: s.subjectName,
      description,
      sac: "999299",
      qty: `${totalUnits} SESS`,
      rate: s.perClassRate,
      discount: 0,
      amount: s.amount,
    };
  });

  if (examFee?.amount > 0) {
    items.push({
      name: "Question Tool Exams",
      description: `${examFee.sessions} exam sessions`,
      sac: "999299",
      qty: `${examFee.sessions} SESS`,
      rate: examFee.rate,
      discount: 0,
      amount: examFee.amount,
    });
  }

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);

  return {
    invoiceNo: bill.invoiceId,
    invoiceDate: formatDate(bill.billDate),
    dueDate: formatDate(bill.dueDate || bill.billDate),
    student: {
      name: bill.studentName,
      mobile: "-",
    },
    items,
    subtotal,
    totalDiscount: 0,
    receivedAmount: bill.paidAmount || 0,
    amountInWords: toWords(Math.round(subtotal)),
  };
};

/* ================= GENERATE INVOICE PDF FOR SECONDARY STUDENT ================= */
exports.generateInvoicePdf = async (req, res) => {
  const { studentId } = req.params;

  try {
    const invoiceData = await getSecondaryInvoiceData(studentId);

    if (!invoiceData) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const html = invoiceTemplate(invoiceData);

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=invoice_${invoiceData.invoiceNo}.pdf`,
    });

    res.send(pdfBuffer);
  } catch (error) {
    logger.error("Error generating secondary student invoice", error);
    res.status(500).json({ message: "Failed to generate invoice" });
  }
};

/* ================= DOWNLOAD RECEIPT FOR SECONDARY STUDENT BILL ================= */
exports.downloadReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await SecondaryStudentBill.findOne({
      where: { id, isDeleted: false },
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    const paidAmount = bill.paidAmount || bill.amount;
    const amountInWords = toWords(Math.round(paidAmount));

    const data = {
      paymentNumber: bill.paymentNumber || bill.invoiceId,
      paymentDate: formatDate(bill.paymentDate || bill.billDate),
      paymentMode: bill.paymentMode || "Bank",
      companyName: "teacherInd Loro Talento Pvt Ltd.",

      studentName: bill.studentName,
      totalAmount: paidAmount,
      amountInWords,

      items: [
        {
          invoiceNumber: bill.invoiceId,
          invoiceDate: formatDate(bill.billDate),
          invoiceAmount: bill.amount,
          paymentAmount: paidAmount,
          tds: 0,
          balance: bill.dueAmount || 0,
        },
      ],
    };

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(receiptTemplate(data), { waitUntil: "networkidle0" });

    const pdf = await page.pdf({ format: "A4", printBackground: true });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=secondary-student-receipt-${bill.invoiceId}.pdf`,
    });

    res.send(pdf);
  } catch (error) {
    logger.error("Download secondary student receipt error", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate receipt",
    });
  }
};
