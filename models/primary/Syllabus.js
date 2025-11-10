const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const Syllabus = sequelizePrimary.define(
  "syllabus",
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
    tableName: "syllabus", // 👈 exact table name in DB
    timestamps: true, // 👈 adds createdAt & updatedAt
  }
);

module.exports = Syllabus;
