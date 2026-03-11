const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const BasePaySyllabus = sequelizePrimary.define(
  "BasePaySyllabus",
  {
    basePayId: {
      type: DataTypes.INTEGER,
      references: {
        model: "base_pays",
        key: "id",
      },
    },

    syllabusId: {
      type: DataTypes.INTEGER,
      references: {
        model: "syllabus",
        key: "id",
      },
    },
  },
  {
    tableName: "base_pay_syllabus",
    timestamps: false,
  }
);

module.exports = BasePaySyllabus;