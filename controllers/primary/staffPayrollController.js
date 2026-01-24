const StaffPayroll = require("../../models/primary/StaffPayroll");
const PayrollAudit = require("../../models/primary/PayrollAudit");
const Staff = require("../../models/primary/Staff");
const logger = require("../../utils/logger");
const { getPaginationParams } = require("../../utils/pagination");
const { Op } = require("sequelize");

/* =========================
   CREATE PAYROLL
========================= */
exports.createPayroll = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      createdBy: req.user?.id,
    };

    const exists = await StaffPayroll.findOne({
      where: {
        staffId: payload.staffId,
        payrollMonth: payload.payrollMonth,
        isDeleted: false,
      },
    });

    if (exists) {
      return res.status(409).json({
        message: "Payroll already exists for this staff & month",
      });
    }

    const payroll = await StaffPayroll.create(payload);

    await PayrollAudit.create({
      payrollId: payroll.id,
      staffId: payroll.staffId,
      action: "CREATE",
      staffType: "STAFF",
      newData: payroll.toJSON(),
      changedBy: req.user?.id,
    });

    res.status(201).json({
      message: "Payroll created successfully",
      data: payroll,
    });
  } catch (err) {
    logger.error("Create payroll error", err);
    res.status(500).json({ message: err.message });
  }
};

/* =========================
   GET ALL PAYROLLS
========================= */
exports.getAllPayrolls = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req);

    const payrolls = await StaffPayroll.findAndCountAll({
      where: { isDeleted: false },
      include: [
        {
          model: Staff,
          attributes: ["id", "fullName", "employeeId"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    // ✅ Normalize JSON fields
    const rows = payrolls.rows.map((item) => {
      const data = item.toJSON();

      return {
        ...data,
        earnings:
          typeof data.earnings === "string"
            ? JSON.parse(data.earnings || "[]")
            : data.earnings,
        deductions:
          typeof data.deductions === "string"
            ? JSON.parse(data.deductions || "[]")
            : data.deductions,
      };
    });

    res.json({
      data: rows,
      pagination: {
        totalRecords: payrolls.count,
        page,
        limit,
        totalPages: Math.ceil(payrolls.count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================
   GET PAYROLL BY ID
========================= */
exports.getPayrollById = async (req, res) => {
  try {
    const payroll = await StaffPayroll.findOne({
      where: { id: req.params.id, isDeleted: false },
      include: [Staff],
    });

    if (!payroll) {
      return res.status(404).json({ message: "Payroll not found" });
    }

    res.json({ data: payroll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================
   UPDATE PAYROLL (AUDITED)
========================= */
exports.updatePayroll = async (req, res) => {
  try {
    const payroll = await StaffPayroll.findOne({
      where: { id: req.params.id, isDeleted: false },
    });

    if (!payroll) {
      return res.status(404).json({ message: "Payroll not found" });
    }

    const oldData = payroll.toJSON();
    const changedFields = Object.keys(req.body);

    await payroll.update({
      ...req.body,
      updatedBy: req.user?.id,
    });

    await PayrollAudit.create({
      payrollId: payroll.id,
      staffId: payroll.staffId,
      staffType: "STAFF",
      action: "UPDATE",
      oldData,
      newData: payroll.toJSON(),
      changedFields,
      changedBy: req.user?.id,
    });

    res.json({
      message: "Payroll updated successfully",
      data: payroll,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================
   DELETE PAYROLL (SOFT)
========================= */
exports.deletePayroll = async (req, res) => {
  try {
    const payroll = await StaffPayroll.findOne({
      where: { id: req.params.id, isDeleted: false },
    });

    if (!payroll) {
      return res.status(404).json({ message: "Payroll not found" });
    }

    await payroll.update({
      isDeleted: true,
      updatedBy: req.user?.id,
    });

    await PayrollAudit.create({
      payrollId: payroll.id,
      staffId: payroll.staffId,
      action: "DELETE",
      oldData: payroll.toJSON(),
      changedBy: req.user?.id,
    });

    res.json({ message: "Payroll deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================
   GET PAYROLL AUDIT
========================= */
exports.getPayrollAudit = async (req, res) => {
  try {
    const audits = await PayrollAudit.findAll({
      where: { payrollId: req.params.id },
      order: [["createdAt", "DESC"]],
    });

    res.json({ data: audits });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================
   PAYROLL SUMMARY (CURRENT MONTH)
========================= */
exports.getCurrentMonthPayrollSummary = async (req, res) => {
  try {
    // Start & End of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(
      startOfMonth.getFullYear(),
      startOfMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // 1️⃣ Total active staff
    const totalStaff = await Staff.count({
      where: {
        isDeleted: false, // if you have soft delete in staff
      },
    });

    // 2️⃣ Payrolls created for current month
    const completedPayrolls = await StaffPayroll.count({
      where: {
        isDeleted: false,
        payrollMonth: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
    });

    // 3️⃣ Pending payrolls
    const pendingPayrolls = totalStaff - completedPayrolls;

    res.json({
      message: "Current month payroll summary",
      data: {
        total: totalStaff,
        completed: completedPayrolls,
        pending: pendingPayrolls < 0 ? 0 : pendingPayrolls,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
