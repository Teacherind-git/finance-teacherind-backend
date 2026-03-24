// models/primary/TutorSalaryBreakdown.js
const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const TutorSalary = require("./TutorSalary");

const TutorSalaryBreakdown = sequelizePrimary.define(
  "tutor_salary_breakdown",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    salaryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tutor_salary",
        key: "id",
      },
    },

    payrollId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tutor_payrolls",
        key: "id",
      },
    },

    tutorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    classNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    syllabusName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    studentName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    basePay: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    duration: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },

    classUnits: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },

    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    status: {
      type: DataTypes.INTEGER, // 2=attended, 0=missed, 3=rescheduled
      allowNull: true,
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
    tableName: "tutor_salary_breakdown",
    timestamps: true,
  }
);

// 🔗 Associations
TutorSalaryBreakdown.belongsTo(TutorSalary, {
  foreignKey: "salaryId",
  as: "salary",
});

TutorSalary.hasMany(TutorSalaryBreakdown, {
  foreignKey: "salaryId",
  as: "breakdowns",
});

module.exports = TutorSalaryBreakdown;