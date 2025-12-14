const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const CounselorPayroll = sequelizePrimary.define(
  "counselor_payroll",
  {
    counselorId: {
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

    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: "counselor_payrolls",
    timestamps: true,
  }
);

module.exports = CounselorPayroll;
