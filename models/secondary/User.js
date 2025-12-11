// models/secondary/User.js
const { DataTypes } = require("sequelize");
const { sequelizeSecondary } = require("../../config/db");

const User = sequelizeSecondary.define(
  "user",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    admissionno: { type: DataTypes.STRING },
    age: { type: DataTypes.STRING },
    alternatecontact: { type: DataTypes.STRING },
    classes: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE },
    email: { type: DataTypes.STRING },
    email_verified_at: { type: DataTypes.DATE },
    fullname: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    password: { type: DataTypes.STRING },
    qualification: { type: DataTypes.STRING },
    location: { type: DataTypes.STRING },
    role: { type: DataTypes.INTEGER },
    status: { type: DataTypes.INTEGER },
    subjects: { type: DataTypes.STRING },
    tutors: { type: DataTypes.STRING },
    remember_token: { type: DataTypes.STRING },

    istrainer: { type: DataTypes.TINYINT },
    updated_at: { type: DataTypes.DATE },
  },
  {
    tableName: "users",
    timestamps: false, // Laravel timestamps are not Sequelize defaults
  }
);

module.exports = User;

