// models/secondary/SubjectPlan.js
const { DataTypes } = require("sequelize");
const { sequelizeSecondary } = require("../../config/db");

const SubjectPlan = sequelizeSecondary.define(
  "subjectplan",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: { type: DataTypes.BIGINT.UNSIGNED },
    subject_id: { type: DataTypes.STRING },
    subject_name: { type: DataTypes.STRING },
    plan_type: { type: DataTypes.STRING },
    noofclasses: { type: DataTypes.INTEGER },
    noofexams: { type: DataTypes.TINYINT },
    started_at: { type: DataTypes.DATEONLY },
    expiry_date: { type: DataTypes.DATEONLY },
    ended_at: { type: DataTypes.DATEONLY },
    renewed_by: { type: DataTypes.BIGINT.UNSIGNED },
    created_by: { type: DataTypes.BIGINT.UNSIGNED },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  {
    tableName: "subject_plans",
    timestamps: false, // Laravel timestamps are not Sequelize defaults
  },
);

module.exports = SubjectPlan;
