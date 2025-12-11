const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const StaffSalary = sequelizePrimary.define(
  "staff_salary",
  {
    payrollId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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

module.exports = StaffSalary;
