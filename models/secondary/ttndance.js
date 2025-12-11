const { DataTypes } = require("sequelize");
const { sequelizeSecondary } = require("../../config/db");

const Attendance = sequelizeSecondary.define(
  "attendance",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    class_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    isattendancecon: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: "1 = present, 0 = absent",
    },

    joiningtime: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "attendance",
    timestamps: false, // because created_at & updated_at in DB
  }
);

module.exports = Attendance;
