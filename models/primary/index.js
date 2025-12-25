const Staff = require("./Staff");
const StaffPayroll = require("./StaffPayroll");
const PayrollAudit = require("./PayrollAudit");

/* =========================
   ASSOCIATIONS
========================= */

// Staff → Payrolls
Staff.hasMany(StaffPayroll, {
  foreignKey: "staffId",
});

StaffPayroll.belongsTo(Staff, {
  foreignKey: "staffId",
});

// Payroll → Audit
StaffPayroll.hasMany(PayrollAudit, {
  foreignKey: "payrollId",
});

PayrollAudit.belongsTo(StaffPayroll, {
  foreignKey: "payrollId",
});

module.exports = {
  Staff,
  StaffPayroll,
  PayrollAudit,
};
