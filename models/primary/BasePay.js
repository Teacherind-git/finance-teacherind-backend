const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const ClassRange = require("./ClassRange");
const Syllabus = require("./Syllabus");

const BasePay = sequelizePrimary.define(
  "BasePay",
  {
    slab: {
      type: DataTypes.ENUM("slab1", "slab2", "slab3"),
      allowNull: false,
    },

    classRangeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "class_ranges",
        key: "id",
      },
    },

    syllabusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "syllabus",
        key: "id",
      },
    },

    board: {
      type: DataTypes.ENUM("White Board", "Pen Tab"),
      allowNull: false,
    },

    basePay: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    isDeleted: {
      type: DataTypes.BOOLEAN,
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
    tableName: "base_pays",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["slab", "classRangeId", "syllabusId", "board"],
      },
    ],
  },
);

// ✅ Associations
BasePay.belongsTo(ClassRange, {
  foreignKey: "classRangeId",
  as: "classRange",
});

BasePay.belongsTo(Syllabus, {
  foreignKey: "syllabusId",
  as: "syllabus",
});

module.exports = BasePay;