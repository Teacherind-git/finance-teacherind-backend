const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");

const PayrollAudit = sequelizePrimary.define(
  "payroll_audit",
  {
    payrollId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    staffType: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    action: {
      type: DataTypes.ENUM("CREATE", "UPDATE", "DELETE"),
      allowNull: false,
    },

    oldData: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    newData: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    changedFields: {
      type: DataTypes.JSON,
      defaultValue: [],
    },

    changedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    tableName: "payroll_audits",
    timestamps: true,
  }
);

module.exports = PayrollAudit;
