const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const ClassRange = require("./ClassRange");
const PayRule = require("./TutorPayRule");

const BasePay = sequelizePrimary.define(
  "BasePay",
  {
    classRangeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "class_ranges",
        key: "id",
      },
    },
    basePay: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    payRuleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "pay_rules",
        key: "id",
      },
    },
  },
  {
    tableName: "base_pays",
    timestamps: true,
  }
);

// ---- Associations ----
BasePay.belongsTo(ClassRange, { foreignKey: "classRangeId", as: "classRange" });
BasePay.belongsTo(PayRule, { foreignKey: "payRuleId", as: "payRule" });

PayRule.hasMany(BasePay, { foreignKey: "payRuleId", as: "basePays" });

module.exports = BasePay;
