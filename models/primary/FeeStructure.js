const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const ClassRange = require("../../models/primary/ClassRange"); // <-- import your table

const FeeStructure = sequelizePrimary.define(
  "FeeStructure",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    classRangeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "class_ranges", // table name of ClassRange
        key: "id",
      },
    },

    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "subjects",
        key: "id",
      },
    },

    feePerHour: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    addedBy: {
      type: DataTypes.STRING,
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
    tableName: "tuition_fees",
    timestamps: true,
  }
);

// ⭐ ASSOCIATIONS
FeeStructure.belongsTo(ClassRange, {
  foreignKey: "classRangeId",
  as: "classRange",
});

module.exports = FeeStructure;
