const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../config/db");

const FeeStructure = sequelizePrimary.define(
  "FeeStructure",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    classRange: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    syllabus: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    feePerHour: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    addedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "tuition_fees",
    timestamps: true,
  }
);

module.exports = FeeStructure;
