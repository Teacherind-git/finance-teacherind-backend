const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const Package = sequelizePrimary.define(
  "Package",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    classesPerMonth: { type: DataTypes.INTEGER, allowNull: false },
    multiplier: { type: DataTypes.FLOAT, allowNull: true },

    description: { type: DataTypes.STRING, allowNull: true },
    tag: { type: DataTypes.STRING, allowNull: true },

    // ⭐ NEW FIELDS
    growthSession: { type: DataTypes.INTEGER, allowNull: true },
    questionToolExam: { type: DataTypes.INTEGER, allowNull: true },
    extraExamPrice: { type: DataTypes.FLOAT, allowNull: true },
    headerColor: { type: DataTypes.STRING, allowNull: true },

    isHighlight: { type: DataTypes.BOOLEAN, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
  },
  {
    tableName: "packages",
    timestamps: true,
  }
);

module.exports = Package;
