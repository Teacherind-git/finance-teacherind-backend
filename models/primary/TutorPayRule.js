const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const PayRule = sequelizePrimary.define(
  "PayRule",
  {
    config: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "pay_rules",
    timestamps: true,
  }
);

module.exports = PayRule;
