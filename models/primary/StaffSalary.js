const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const Staff = require("./Staff");

const StaffSalary = sequelizePrimary.define(
  "staff_salary",
  {
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "staff",
        key: "id",
      },
    },

    basicSalary: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    hra: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    allowance: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    deduction: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    netSalary: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    effectiveFrom: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    status: {
      type: DataTypes.STRING,
      defaultValue: "Active",
    },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "staff_salaries",
    timestamps: true,
  }
);

Staff.hasMany(StaffSalarySetup, {
  foreignKey: "staffId",
});

StaffSalarySetup.belongsTo(Staff, {
  foreignKey: "staffId",
});


module.exports = StaffSalarySetup;
