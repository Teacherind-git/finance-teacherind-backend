const { DataTypes } = require("sequelize");
const { sequelizeSecondary } = require("../config/db");

const Syllabus = sequelizeSecondary.define("Syllabus", {
  name: DataTypes.STRING,
}, { tableName: "syllabus", timestamps: false });

module.exports = Syllabus;