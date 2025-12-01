const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const Role = sequelizePrimary.define(
  "Role",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // e.g., admin, finance-manager, hr
    },
    permissions: {
      type: DataTypes.JSON, // store array of strings as JSON
      allowNull: true, // optional
      defaultValue: [], // default empty array
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
    tableName: "roles",
    timestamps: true, // adds createdAt and updatedAt columns
  }
);

module.exports = Role;
