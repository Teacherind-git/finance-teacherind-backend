const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const Student = sequelizePrimary.define(
  "student",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contact: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("Onboard", "Active", "Inactive", "Pending"),
      defaultValue: "Onboard",
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
  {
    tableName: "students",
    timestamps: true,
  }
);

module.exports = Student;
