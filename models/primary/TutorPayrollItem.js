const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const TutorPayroll = require("./TutorPayroll");
const Class = require("./Class");
const Syllabus = require("./Syllabus");

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

    /* 🔹 NEW STRUCTURE */

    classId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    syllabusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    board: {
      type: DataTypes.ENUM("White Board", "Pen Tab"),
      allowNull: false,
    },

    slab: {
      type: DataTypes.ENUM("slab1", "slab2", "slab3"),
      allowNull: false,
    },

    /* 🔹 Snapshot of BasePay */
    basePay: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "tutor_payroll_items",
    timestamps: true,
  }
);

TutorPayroll.hasMany(TutorPayrollItem, { as: "items", foreignKey: "tutorPayrollId" });
TutorPayrollItem.belongsTo(TutorPayroll, { foreignKey: "tutorPayrollId" });

TutorPayrollItem.belongsTo(Class, { as: "class", foreignKey: "classId" });
TutorPayrollItem.belongsTo(Syllabus, { as: "syllabus", foreignKey: "syllabusId" });

module.exports = TutorPayrollItem;