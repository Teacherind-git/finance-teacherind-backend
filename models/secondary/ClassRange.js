const { DataTypes } = require("sequelize");
const { sequelizeSecondary } = require("../config/db");

const ClassRange = sequelizeSecondary.define("ClassRange", {
  name: DataTypes.STRING,
}, { tableName: "class_ranges", timestamps: false });

module.exports = ClassRange;