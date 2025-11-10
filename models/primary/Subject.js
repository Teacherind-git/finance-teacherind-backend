const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const Subject = sequelizePrimary.define(
  "subjects",
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "subjects", // 👈 Force exact table name
    timestamps: true,
  }
);

module.exports = Subject;
