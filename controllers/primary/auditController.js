const PayrollAudit = require("../../models/primary/PayrollAudit");

/**
 * Compare old & new data and return only changed fields
 */
const getChangedValues = (oldData = {}, newData = {}) => {
  const IGNORE_FIELDS = ["createdAt", "updatedAt", "deletedAt"];

  const changes = {};

  const keys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ]);

  for (const key of keys) {
    if (IGNORE_FIELDS.includes(key)) continue;

    const oldValue = oldData?.[key];
    const newValue = newData?.[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = {
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
      };
    }
  }

  return changes;
};

exports.getPayrollAudits = async (req, res) => {
  try {
    const { payrollId, staffId, staffType } = req.query;

    // 🔐 Validation
    if (!payrollId || !staffId || !staffType) {
      return res.status(400).json({
        success: false,
        message: "payrollId, staffId, and staffType are required",
      });
    }

    // 📦 Fetch audits
    const audits = await PayrollAudit.findAll({
      where: {
        payrollId,
        staffId,
        staffType,
      },
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    // 🔄 Format response
    const response = audits.map((audit) => {
      let changes = {};

      if (audit.action === "UPDATE") {
        changes = getChangedValues(audit.oldData, audit.newData);
      }

      if (audit.action === "CREATE") {
        changes = Object.keys(audit.newData || {}).reduce((acc, key) => {
          acc[key] = {
            oldValue: null,
            newValue: audit.newData[key],
          };
          return acc;
        }, {});
      }

      if (audit.action === "DELETE") {
        changes = Object.keys(audit.oldData || {}).reduce((acc, key) => {
          acc[key] = {
            oldValue: audit.oldData[key],
            newValue: null,
          };
          return acc;
        }, {});
      }

      return {
        id: audit.id,
        payrollId: audit.payrollId,
        staffId: audit.staffId,
        staffType: audit.staffType,
        action: audit.action,
        changedBy: audit.changedBy,
        createdAt: audit.createdAt,

        // 👇 ONLY changed values
        changes,
      };
    });

    return res.status(200).json({
      success: true,
      count: response.length,
      data: response,
    });
  } catch (error) {
    console.error("Error fetching payroll audits:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
