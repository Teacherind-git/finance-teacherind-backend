const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const StaffPayroll = require("./StaffPayroll");
const CounselorPayroll = require("./CounselorPayroll");

const StaffSalary = sequelizePrimary.define(
  "staff_salary",
  {
    staffPayrollId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    counselorPayrollId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    payrollMonth: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    counselorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM("STAFF", "COUNSELOR"),
      allowNull: false,
    },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    salaryDate: { type: DataTypes.DATE, allowNull: false },
    dueDate: { type: DataTypes.DATE, allowNull: false },
    finalDueDate: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.STRING,
      defaultValue: "Pending",
      allowNull: false,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    paidDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    tableName: "staff_salary", // 👈 Force exact table name
    timestamps: true,
  }
);
// STAFF PAYROLL RELATION
StaffSalary.belongsTo(StaffPayroll, {
  foreignKey: "staffPayrollId",
  as: "staffPayroll",
});

StaffPayroll.hasMany(StaffSalary, {
  foreignKey: "staffPayrollId",
  as: "staffSalaries",
});

// COUNSELOR PAYROLL RELATION
StaffSalary.belongsTo(CounselorPayroll, {
  foreignKey: "counselorPayrollId",
  as: "counselorPayroll",
});

CounselorPayroll.hasMany(StaffSalary, {
  foreignKey: "counselorPayrollId",
  as: "counselorSalaries",
});

module.exports = StaffSalary;
