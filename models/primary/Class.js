const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const Class = sequelizePrimary.define(
  "classes",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    firebase_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "classes", // 👈 Force exact table name
    timestamps: true,
  }
);

module.exports = Class;
