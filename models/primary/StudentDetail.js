const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const Student = require("./Student");

const StudentDetail = sequelizePrimary.define(
  "student_detail",
  {
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "students",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    packageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    packagePrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    discount: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    }
  },
  {
    tableName: "student_details",
    timestamps: true,
  }
);

// Relations
Student.hasMany(StudentDetail, { foreignKey: "studentId", as: "details" });
StudentDetail.belongsTo(Student, { foreignKey: "studentId", as: "student" });

module.exports = StudentDetail;
