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
      type: DataTypes.DATE,
      allowNull: true,
    },

    // ✅ Class counts
    totalClasses: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    attendedClasses: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    missedClasses: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    grossSalary: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    earnings: {
      type: DataTypes.JSON,
      defaultValue: [],
    },

    totalEarnings: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    deductions: {
      type: DataTypes.JSON,
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

    remark: {
      type: DataTypes.TEXT,
    },

    isDeleted: {
      type: DataTypes.BOOLEAN,
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
    tableName: "tutor_payrolls",
    timestamps: true,
  },
);

module.exports = TutorPayroll;
