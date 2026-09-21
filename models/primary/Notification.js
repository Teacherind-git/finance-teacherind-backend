const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const Notification = sequelizePrimary.define(
  "Notification",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    referenceKey: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    notificationDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "notifications",
    timestamps: true,
    indexes: [
      { fields: ["userId", "createdAt"] },
      {
        unique: true,
        fields: ["userId", "type", "referenceKey", "notificationDate"],
      },
    ],
  },
);

module.exports = Notification;