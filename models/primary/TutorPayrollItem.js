const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const TutorPayroll = require("./TutorPayroll");
const Class = require("./Class");
const Subject = require("./Subject");

const TutorPayrollItem = sequelizePrimary.define(
  "TutorPayrollItem",
  {
    tutorPayrollId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tutor_payrolls",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    tutorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    classId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    basePay: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "tutor_payroll_items",
    timestamps: true,
  },
);

TutorPayroll.hasMany(TutorPayrollItem, { as: "items", foreignKey: "tutorPayrollId" });
TutorPayrollItem.belongsTo(TutorPayroll, { foreignKey: "tutorPayrollId" });

TutorPayrollItem.belongsTo(Class, { as: "class", foreignKey: "classId" });
TutorPayrollItem.belongsTo(Subject, { as: "subject", foreignKey: "subjectId" });

module.exports = TutorPayrollItem;
