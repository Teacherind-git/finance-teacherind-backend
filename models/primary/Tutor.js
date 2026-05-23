const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const Tutor = sequelizePrimary.define(
  "tutor",
  {
    // ======================================================
    // BASIC INFO
    // ======================================================

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

    age: {
      type: DataTypes.STRING,
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
      validate: {
        isEmail: true,
      },
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    reportingManager: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    qualification: {
      type: DataTypes.STRING,
      allowNull: false,
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

    // ======================================================
    // SALARY
    // ======================================================

    workStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    salaryType: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    paymentFreq: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    currentSalary: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    bankDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },

    // ======================================================
    // TEACHING DETAILS
    // ======================================================

    teachingDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },

    // ======================================================
    // EQUIPMENT
    // ======================================================

    hasLaptop: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    hasWhiteBoard: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    hasDigitalPen: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    hasMobile: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    hasPad: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // ======================================================
    // LANGUAGES
    // ======================================================

    languages: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },

    // ======================================================
    // AVAILABILITY
    // ======================================================

    availableDays: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },

    availabilitySlots: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },

    // ======================================================
    // ADDITIONAL DETAILS
    // ======================================================

    experience: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    preferredLocation: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    shortBio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ======================================================
    // DOCUMENTS
    // ======================================================

    documents: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },

    // ======================================================
    // SYSTEM
    // ======================================================

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
    tableName: "tutors",
    timestamps: true,
  },
);

module.exports = Tutor;
