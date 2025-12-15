const puppeteer = require("puppeteer");
const StudentBill = require("../../../models/primary/StudentBill");
const Student = require("../../../models/primary/Student");
const StudentDetail = require("../../../models/primary/StudentDetail");
const ClassRange = require("../../../models/primary/ClassRange");
const Subject = require("../../../models/primary/Subject");
const Package = require("../../../models/primary/Package");
const logger = require("../../../utils/logger");
const { getInvoiceData } = require("../../../services/invoiceService");
const invoiceTemplate = require("../../../templates/invoiceTemplate");
const { getPaginationParams } = require("../../../utils/pagination");
const { Op } = require("sequelize");
const moment = require("moment");

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
      "createdAt"
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

exports.getStudentBillsSummary = async (req, res) => {
  try {
    logger.info("Get global student bills summary API called", {
      requestedBy: req.user?.id || "anonymous",
    });

    const baseWhere = {
      status: {
        [Op.in]: ["Pending", "On Due", "Overdue"],
      },
    };

    // 📅 Date ranges
    const todayStart = moment().startOf("day").toDate();
    const todayEnd = moment().endOf("day").toDate();

    const weekStart = moment().startOf("week").toDate();
    const weekEnd = moment().endOf("week").toDate();

    const [
      totalCount,
      totalAmount,
      todayCount,
      todayAmount,
      weekCount,
      weekAmount,
    ] = await Promise.all([
      // 🔢 TOTAL
      StudentBill.count({ where: baseWhere }),
      StudentBill.sum("amount", { where: baseWhere }),

      // 🔢 TODAY
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

      // 🔢 WEEK
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
          count: totalCount,
          amount: totalAmount || 0,
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


