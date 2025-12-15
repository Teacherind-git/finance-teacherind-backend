const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const Student = require("./Student");

const StudentBill = sequelizePrimary.define(
  "student_bill",
  {
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    invoiceId: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    billDate: { type: DataTypes.DATE, allowNull: false },
    dueDate: { type: DataTypes.DATE, allowNull: false },
    finalDueDate: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.STRING,
      defaultValue: "Generated",
      allowNull: false,
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
    tableName: "student_bills", // 👈 Force exact table name
    timestamps: true,
  }
);

// Relations
Student.hasMany(StudentBill, {
  foreignKey: "studentId",
});

StudentBill.belongsTo(Student, {
  foreignKey: "studentId",
});

module.exports = StudentBill;
