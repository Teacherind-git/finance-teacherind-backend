const StaffPayroll = require("../../models/primary/StaffPayroll");
const Staff = require("../../models/primary/Staff");
const logger = require("../../utils/logger");
const { getPaginationParams } = require("../../utils/pagination");


/**
 * CREATE payroll
 */
exports.createPayroll = async (req, res) => {
  logger.info("Create payroll request received", {
    body: req.body,
    userId: req.user?.id,
  });

  try {
    const payload = req.body;

    const exist = await StaffPayroll.findOne({
      where: {
        staffId: payload.staffId,
        payrollMonth: payload.payrollMonth,
        isDeleted: false,
      },
    });

    if (exist) {
      logger.warn("Duplicate payroll detected", {
        staffId: payload.staffId,
        payrollMonth: payload.payrollMonth,
      });

      return res.status(409).json({
        message: "Payroll already exists for this staff & month",
      });
    }

    const payroll = await StaffPayroll.create(payload);

    logger.info("Payroll created successfully", {
      payrollId: payroll.id,
      staffId: payload.staffId,
      payrollMonth: payload.payrollMonth,
    });

    res.status(201).json({
      message: "Payroll created successfully",
      data: payroll,
    });
  } catch (error) {
    logger.error("Error creating payroll", {
      error: error.message,
      stack: error.stack,
      payload: req.body,
    });

    res.status(500).json({ message: error.message });
  }
};

/**
 * GET all payrolls
 */
exports.getAllPayrolls = async (req, res) => {
  logger.info("Fetch all payrolls request");

  try {
    const { page, limit, sortBy, sortOrder } = getPaginationParams(
      req,
      [
        "createdAt",
        "netSalary",
        "grossSalary",
        "status",
      ],
      "createdAt"
    );

    const payrolls = await StaffPayroll.findAll({
      where: { isDeleted: false },
      include: [
        {
          model: Staff,
          attributes: ["id", "fullName", "email", "employeeId"],
        },
      ],
      raw: false,
      nest: true,
    });

    /* -------------------------
       BUSINESS SORT: netSalary = 0 FIRST
    -------------------------- */
    payrolls.sort((a, b) => {
      if (a.netSalary === 0 && b.netSalary !== 0) return -1;
      if (a.netSalary !== 0 && b.netSalary === 0) return 1;
      return 0;
    });

    /* -------------------------
       DYNAMIC SORT (UI)
    -------------------------- */
    payrolls.sort((a, b) => {
      const A = a[sortBy];
      const B = b[sortBy];

      if (A == null) return 1;
      if (B == null) return -1;

      return sortOrder === "ASC"
        ? A > B ? 1 : -1
        : A < B ? 1 : -1;
    });

    /* -------------------------
       PAGINATION
    -------------------------- */
    const totalRecords = payrolls.length;
    const startIndex = (page - 1) * limit;
    const paginatedData = payrolls.slice(startIndex, startIndex + limit);

    logger.info("Payrolls fetched successfully", {
      totalRecords,
      page,
      limit,
    });

    res.json({
      data: paginatedData,
      pagination: {
        totalRecords,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(totalRecords / limit),
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    logger.error("Error fetching payrolls", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({ message: error.message });
  }
};

/**
 * GET payroll by ID
 */
exports.getPayrollById = async (req, res) => {
  logger.info("Fetch payroll by ID request", {
    payrollId: req.params.id,
  });

  try {
    const payroll = await StaffPayroll.findOne({
      where: {
        id: req.params.id,
        isDeleted: false,
      },
      include: [{ model: Staff }],
    });

    if (!payroll) {
      logger.warn("Payroll not found", {
        payrollId: req.params.id,
      });

      return res.status(404).json({ message: "Payroll not found" });
    }

    logger.info("Payroll fetched successfully", {
      payrollId: payroll.id,
    });

    res.json({ data: payroll });
  } catch (error) {
    logger.error("Error fetching payroll by ID", {
      error: error.message,
      stack: error.stack,
      payrollId: req.params.id,
    });

    res.status(500).json({ message: error.message });
  }
};

/**
 * UPDATE payroll
 */
exports.updatePayroll = async (req, res) => {
  logger.info("Update payroll request", {
    payrollId: req.params.id,
    body: req.body,
    userId: req.user?.id,
  });

  try {
    const payroll = await StaffPayroll.findOne({
      where: {
        id: req.params.id,
        isDeleted: false,
      },
    });

    if (!payroll) {
      logger.warn("Payroll not found for update", {
        payrollId: req.params.id,
      });

      return res.status(404).json({ message: "Payroll not found" });
    }

    await payroll.update({
      ...req.body,
      updatedBy: req.user.id, // or req.user._id based on your auth
    });

    logger.info("Payroll updated successfully", {
      payrollId: payroll.id,
      updatedFields: Object.keys(req.body),
    });

    res.json({
      message: "Payroll updated successfully",
      data: payroll,
    });
  } catch (error) {
    logger.error("Error updating payroll", {
      error: error.message,
      stack: error.stack,
      payrollId: req.params.id,
    });

    res.status(500).json({ message: error.message });
  }
};

/**
 * SOFT DELETE payroll
 */
exports.deletePayroll = async (req, res) => {
  logger.info("Delete payroll request", {
    payrollId: req.params.id,
    userId: req.user?.id,
  });

  try {
    const payroll = await StaffPayroll.findOne({
      where: {
        id: req.params.id,
        isDeleted: false,
      },
    });

    if (!payroll) {
      logger.warn("Payroll not found for delete", {
        payrollId: req.params.id,
      });

      return res.status(404).json({ message: "Payroll not found" });
    }

    await payroll.update({
      isDeleted: true,
      updatedBy: req.user?.id || null,
    });

    logger.info("Payroll soft deleted successfully", {
      payrollId: payroll.id,
      deletedBy: req.user?.id,
    });

    res.json({ message: "Payroll deleted successfully" });
  } catch (error) {
    logger.error("Error deleting payroll", {
      error: error.message,
      stack: error.stack,
      payrollId: req.params.id,
    });

    res.status(500).json({ message: error.message });
  }
};
