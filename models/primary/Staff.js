const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const Staff = sequelizePrimary.define(
  "staff",
  {
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },

    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { notEmpty: true },
    },

    dob: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    joinDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    gender: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["Male", "Female", "Other"]],
      },
    },

    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Active",
      validate: {
        isIn: [["Active", "Inactive"]],
      },
    },

    profilePhoto: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    reportingManager: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    workLocation: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["Remote", "On Site", "Hybrid"]],
      },
    },

    roleName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    department: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    position: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    workStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        notEmpty: true,
      },
    },

    salaryType: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    paymentFreq: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    bankDetails: {
      type: DataTypes.JSON,
      allowNull: true,
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
    tableName: "staffs",
    timestamps: true,
  }
);

module.exports = Staff;
