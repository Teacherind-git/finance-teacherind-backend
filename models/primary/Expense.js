const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const Expense = sequelizePrimary.define(
  "Expense",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    expenseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    subCategory: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    description: {
      type: DataTypes.STRING,
    },

    amount: {
      type: DataTypes.FLOAT,
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
    tableName: "expenses",
    timestamps: true,
  }
);

module.exports = Expense;
