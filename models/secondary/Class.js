const { DataTypes } = require("sequelize");
const { sequelizeSecondary } = require("../../config/db");

const Class = sequelizeSecondary.define(
  "class",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    class: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    classlink: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    classnumber: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    counsellor: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    student: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    syllabus: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    syllabusname: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "class",
    timestamps: false,
  }
);

module.exports = Class;
