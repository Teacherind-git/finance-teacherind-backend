// models/secondary/User.js
const { DataTypes } = require("sequelize");
const { sequelizeSecondary } = require("../../config/db");

const User = sequelizeSecondary.define(
  "user",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
    },
    fullname: DataTypes.STRING,
    role: DataTypes.INTEGER,
    status: DataTypes.INTEGER,
  },
  {
    tableName: "users",
    timestamps: false,
  }
);

module.exports = User;
