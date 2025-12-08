const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const Staff = require("./Staff");

const StaffPayroll = sequelizePrimary.define(
  "staff_payroll",
  {
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "staffs",
        key: "id",
      },
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
    tableName: "staff_payrolls",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["staffId", "payrollMonth"],
      },
    ],
  }
);

Staff.hasMany(StaffPayroll, { foreignKey: "staffId" });
StaffPayroll.belongsTo(Staff, { foreignKey: "staffId" });

module.exports = StaffPayroll;
