const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const TutorPayroll = sequelizePrimary.define(
  "tutor_payroll",
  {
    tutorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    payrollMonth: {
      type: DataTypes.DATE, // e.g. "2025-01"
      allowNull: true,
    },

    baseSalary: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    grossSalary: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    // ✅ Earnings array
    earnings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },

    totalEarnings: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    // ✅ Deductions array
    deductions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },

    totalDeductions: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    netSalary: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "tutor_payrolls",
    timestamps: true,
  }
);

module.exports = TutorPayroll;
