const { DataTypes } = require("sequelize");
const { sequelizeSecondary } = require("../../config/db");

const ClassSchedule = sequelizeSecondary.define(
  "class_schedules",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    class_id: { type: DataTypes.BIGINT, allowNull: false },

    tutor: { type: DataTypes.BIGINT, allowNull: false },

    subject: { type: DataTypes.STRING(255), allowNull: false },
    subjectename: { type: DataTypes.STRING(255), allowNull: false },

    tbt: { type: DataTypes.TEXT, allowNull: true },

    feedback: { type: DataTypes.TEXT, allowNull: true },

    duration: { type: DataTypes.INTEGER, allowNull: false },

    status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    start: { type: DataTypes.DATE, allowNull: true },
    end: { type: DataTypes.DATE, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "class_schedules",
    timestamps: false, // because created_at & updated_at managed manually
  }
);

module.exports = ClassSchedule;
