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
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    tableName: "pay_rules",
    timestamps: true,
  }
);

module.exports = PayRule;
