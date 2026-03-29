const puppeteer = require("puppeteer");
const StudentBill = require("../../../models/primary/StudentBill");
const Student = require("../../../models/primary/Student");
const StudentDetail = require("../../../models/primary/StudentDetail");
const ClassRange = require("../../../models/primary/ClassRange");
const Subject = require("../../../models/primary/Subject");
const Package = require("../../../models/primary/Package");
const logger = require("../../../utils/logger");
const invoiceTemplate = require("../../../templates/invoiceTemplate");
const { getPaginationParams } = require("../../../utils/pagination");
const { Op } = require("sequelize");
const moment = require("moment");
const receiptTemplate = require("../../../templates/billReceiptTemplate");
const { toWords } = require("number-to-words");

exports.getStudentBills = async (req, res) => {
  try {
    const { studentId, status } = req.query;

    // ✅ allowed sortable fields
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "dueDate",
      "amount",
      "status",
    ];

    const { page, limit, offset, sortBy, sortOrder } = getPaginationParams(
      req,
      allowedSortFields,
      "createdAt",
    );

    logger.info("Get student bills API called", {
      studentId,
      status,
      page,
      limit,
      sortBy,
      sortOrder,
      requestedBy: req.user?.id || "anonymous",
    });

    const where = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    logger.debug("Student bill query filters", where);

    const { rows: bills, count } = await StudentBill.findAndCountAll({
      where,
      include: [
        {
          model: Student,
          attributes: ["id", "name", "contact", "status"],
          include: [
            {
              model: StudentDetail,
              as: "details",
              attributes: [
                "id",
                "packagePrice",
                "discount",
                "totalPrice",
                "startDate",
              ],
              include: [
                {
                  model: ClassRange,
                  as: "class_range",
                  attributes: ["id", "label"],
                },
                {
                  model: Subject,
                  as: "subject",
                  attributes: ["id", "name"],
                },
                {
                  model: Package,
                  as: "package",
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
        },
      ],
      limit,
      offset,
      order: [[sortBy, sortOrder]],
      distinct: true, // ✅ important when using include
    });

    if (!bills.length) {
      logger.warn("No student bills found", where);
    }

    logger.info("Student bills fetched successfully", {
      count: bills.length,
    });

    res.status(200).json({
      success: true,
      data: bills,
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
    logger.error("Get Student Bills Error", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch student bills",
    });
  }
};

exports.generateInvoicePdf = async (req, res) => {
  const { studentId } = req.params;

  try {
    const invoiceData = await getInvoiceData(studentId);

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
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=invoice_${invoiceData.invoiceNo}.pdf`,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to generate invoice" });
  }
};

exports.downloadReceipt = async (req, res) => {
  try {
    const billId = req.params.id;

    /* --------------------------------
       FETCH BILL WITH STUDENT DETAILS
    --------------------------------- */
    const bill = await StudentBill.findOne({
      where: {
        id: billId,
        isDeleted: false,
      },
      include: [
        {
          model: Student,
          attributes: ["id", "name", "contact"],
          include: [
            {
              model: StudentDetail,
              as: "details",
              attributes: [
                "packagePrice",
                "discount",
                "totalPrice",
                "startDate",
              ],
              include: [
                {
                  model: Package,
                  as: "package",
                  attributes: ["name"],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Student bill not found",
      });
    }

    const student = bill.student;
    /* --------------------------------
       AMOUNT IN WORDS
    --------------------------------- */
    const amountInWords = toWords(bill.amount); // use your util

    /* --------------------------------
       BUILD RECEIPT DATA (ORIGINAL)
    --------------------------------- */
    const data = {
      paymentNumber: bill.invoiceId,
      paymentDate: formatDate(bill.billDate),
      paymentMode: "Bank", // or bill.paymentMode if exists

      studentName: student.name,
      totalAmount: bill.amount,
      amountInWords,

      items: [
        {
          invoiceNumber: bill.invoiceId,
          invoiceDate: formatDate(bill.billDate),
          invoiceAmount: bill.amount,
          paymentAmount: bill.amount,
          tds: 0,
          balance: 0,
        },
      ],
    };

    /* --------------------------------
       GENERATE PDF
    --------------------------------- */
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(receiptTemplate(data), {
      waitUntil: "networkidle0",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=student-receipt-${bill.invoiceId}.pdf`,
    });

    res.send(pdf);
  } catch (err) {
    console.error("DOWNLOAD RECEIPT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to generate bill",
    });
  }
};

exports.getStudentBillsSummary = async (req, res) => {
  try {
    logger.info("Get global student bills summary API called", {
      requestedBy: req.user?.id || "anonymous",
    });

    // 🔹 Base filters for pending bills
    const baseWhere = {
      status: {
        [Op.in]: ["Generated", "Due", "Overdue"],
      },
    };

    // 🔹 Base filter for paid bills
    const paidWhere = {
      status: "Paid",
    };

    // 📅 Date ranges
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
      // 🔢 TOTAL pending
      StudentBill.count({ where: baseWhere }),
      StudentBill.sum("amount", { where: baseWhere }),

      // 🔢 TOTAL paid
      StudentBill.count({ where: paidWhere }),
      StudentBill.sum("amount", { where: paidWhere }),

      // 🔢 TODAY pending
      StudentBill.count({
        where: {
          ...baseWhere,
          dueDate: { [Op.between]: [todayStart, todayEnd] },
        },
      }),
      StudentBill.sum("amount", {
        where: {
          ...baseWhere,
          dueDate: { [Op.between]: [todayStart, todayEnd] },
        },
      }),

      // 🔢 WEEK pending
      StudentBill.count({
        where: {
          ...baseWhere,
          dueDate: { [Op.between]: [weekStart, weekEnd] },
        },
      }),
      StudentBill.sum("amount", {
        where: {
          ...baseWhere,
          dueDate: { [Op.between]: [weekStart, weekEnd] },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: {
          pending: {
            count: totalCount,
            amount: totalAmount || 0,
          },
          paid: {
            count: paidCount,
            amount: paidAmount || 0,
          },
        },
        today: {
          count: todayCount,
          amount: todayAmount || 0,
        },
        week: {
          count: weekCount,
          amount: weekAmount || 0,
        },
      },
    });
  } catch (error) {
    logger.error("Get Student Bills Summary Error", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch student bills summary",
    });
  }
};

const getInvoiceData = async (studentId) => {
  const bill = await StudentBill.findOne({
    where: {
      studentId,
      isDeleted: false,
    },
    include: [
      {
        model: Student,
        attributes: ["name", "contact"],
        include: [
          {
            model: StudentDetail,
            as: "details",
            attributes: [
              "startDate",
              "packagePrice",
              "discount",
              "totalPrice",
              "duration",
            ],
            include: [
              {
                model: Package,
                as: "package",
                attributes: [
                  "id",
                  "name",
                  "classesPerMonth",
                  "growthSession",
                  "questionToolExam",
                ],
              },
            ],
          },
        ],
      },
    ],
    order: [["billDate", "DESC"]],
  });

  if (!bill) return null;

  const student = bill.student;

  /**
   * 1️⃣ Find ALL active packages for bill date
   */
  const activeDetails = student.details.filter(
    (d) => d.package && isSameMonth(d.startDate, bill.billDate),
  );

  /**
   * 2️⃣ Convert packages into invoice items
   */
  const items = activeDetails.map((detail, index) => {
    const pkg = detail.package;
    const totalSessions =
      (pkg.classesPerMonth || 0) +
      (pkg.growthSession || 0) +
      (pkg.questionToolExam || 0);

    // Build description text
    const description = `${totalSessions} sessions = ${pkg.classesPerMonth} classes + ${pkg.growthSession} growth + ${pkg.questionToolExam} exams`;

    return {
      name: detail.package.name,
      description, // ⬅️ Added here
      sac: "999299",
      qty: detail.duration + " MON",
      rate: detail.packagePrice,
      discount: detail.discount,
      amount: detail.totalPrice,
    };
  });

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);

  return {
    invoiceNo: bill.invoiceId,
    invoiceDate: formatDate(bill.billDate),
    dueDate: formatDate(bill.dueDate || bill.billDate),

    student: {
      name: student.name,
      mobile: student.contact || "-",
    },

    items,

    subtotal,
    totalDiscount,
    receivedAmount: bill.paidAmount || 0,

    amountInWords: toWords(subtotal),

    bank: {
      name: "teacherInd Loro Talento Pvt Ltd",
      account: "25150200002750",
      ifsc: "FDRL0002515",
      branch: "Federal Bank, Kizhissery",
    },
  };
};

const isSameMonth = (startDate, billDate) => {
  const s = new Date(startDate);
  const b = new Date(billDate);

  return s.getFullYear() === b.getFullYear() && s.getMonth() === b.getMonth();
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

exports.markStudentBillPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMode, paidAmount, dueAmount } = req.body;

    const bill = await StudentBill.findByPk(id);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    // Validate dueAmount
    if (dueAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Due amount cannot be negative",
      });
    }

    // Set status based on dueAmount
    const status = dueAmount === 0 ? "Paid" : "Partially Paid";

    // Generate payment number
    const lastPayment = await StudentBill.findOne({
      where: { paymentNumber: { [Op.ne]: null } },
      order: [["id", "DESC"]],
    });

    let nextNumber = 1;

    if (lastPayment?.paymentNumber) {
      const lastNum = parseInt(lastPayment.paymentNumber.split("-")[1]);
      nextNumber = lastNum + 1;
    }

    const paymentNumber = `PAY-${String(nextNumber).padStart(5, "0")}`;
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
      data: {
        paymentNumber,
        paidAt,
        status,
      },
    });
  } catch (error) {
    logger.error("Mark Student Bill Paid Error", error);

    res.status(500).json({
      success: false,
      message: "Failed to update bill status",
    });
  }
};
