const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../config/db");
const TutorIncrement = require("./TutorIncrement");

const TutorPayRule = sequelizePrimary.define(
  "TutorPayRule",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    basePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    ratingBonus: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "tutor_pay_rules",
    timestamps: true,
  }
);

// Relation: One TutorPayRule has many increments
TutorPayRule.hasMany(TutorIncrement, {
  foreignKey: "tutorRuleId",
  as: "increments",
});
TutorIncrement.belongsTo(TutorPayRule, {
  foreignKey: "tutorRuleId",
  as: "tutorRule",
});

module.exports = TutorPayRule;
