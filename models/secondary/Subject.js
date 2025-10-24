const { DataTypes } = require("sequelize");
const { sequelizeSecondary } = require("../config/db");

const Subject = sequelizeSecondary.define("Subject", {
  name: DataTypes.STRING,
}, { tableName: "subjects", timestamps: false });

module.exports = Subject;