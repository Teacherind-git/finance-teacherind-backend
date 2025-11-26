// models/PayRule.js
const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const PayRule = sequelizePrimary.define(
  "PayRule",
  {
    rules_json: {
      type: DataTypes.JSON,
      allowNull: false,
    },
  },
  {
    tableName: "pay_rules",
    timestamps: true,
  }
);

module.exports = PayRule;
