const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const ClassRange = sequelizePrimary.define(
  "ClassRange",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    fromClass: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    toClass: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
  { tableName: "class_ranges", timestamps: true }
);

module.exports = ClassRange;
