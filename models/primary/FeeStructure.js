const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const FeeStructure = sequelizePrimary.define(
  "FeeStructure",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    classRange: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    subject: {
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
    tableName: "tuition_fees",
    timestamps: true,
  }
);

module.exports = FeeStructure;
