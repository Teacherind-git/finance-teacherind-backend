const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const TutorSalary = sequelizePrimary.define(
  "tutor_salary",
  {
    payrollId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    payrollMonth: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    tutorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM("TUTOR"),
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
    tableName: "tutor_salary", // 👈 Force exact table name
    timestamps: true,
  }
);

module.exports = TutorSalary;
