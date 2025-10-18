const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Role = sequelize.define("Role", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // e.g., admin, finance-manager, hr
  },
  permissions: {
    type: DataTypes.JSON, // store array of strings as JSON
    allowNull: true, // optional
    defaultValue: [], // default empty array
  },
}, {
  tableName: "roles",
  timestamps: true, // adds createdAt and updatedAt columns
});

module.exports = Role;
