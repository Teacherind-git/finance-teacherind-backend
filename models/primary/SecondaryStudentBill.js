const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const SecondaryStudentBill = sequelizePrimary.define(
  "secondary_student_bill",
  {
    secondaryStudentId: { type: DataTypes.INTEGER, allowNull: false },
    studentName: { type: DataTypes.STRING, allowNull: false },
    invoiceId: { type: DataTypes.STRING, allowNull: false },
    billingMonth: { type: DataTypes.STRING, allowNull: false }, // e.g. "2026-07"
    classesScheduled: { type: DataTypes.INTEGER, allowNull: false },
    perClassRate: { type: DataTypes.FLOAT, allowNull: false },
    packageId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "packages", key: "id" },
    },
    breakdown: { type: DataTypes.JSON, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    billDate: { type: DataTypes.DATE, allowNull: false },
    dueDate: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.STRING,
      defaultValue: "Generated",
      allowNull: false,
    },
    paidAmount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    dueAmount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    paymentDate: { type: DataTypes.DATE, allowNull: true },
    paymentNumber: { type: DataTypes.STRING, allowNull: true },
    paymentMode: { type: DataTypes.STRING, allowNull: true },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
  },
  {
    tableName: "secondary_student_bills",
    timestamps: true,
  },
);

module.exports = SecondaryStudentBill;
