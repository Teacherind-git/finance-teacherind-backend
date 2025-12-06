const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const Staff = require("./Staff"); // make sure path is correct

const StaffDocument = sequelizePrimary.define("staff_document", {
  staffId: { type: DataTypes.INTEGER, allowNull: false }, // now nullable
  fileName: { type: DataTypes.STRING, allowNull: false },
  filePath: { type: DataTypes.STRING, allowNull: false },
  fileType: { type: DataTypes.STRING, allowNull: true },
});

// Define the inverse association
Staff.hasMany(StaffDocument, {
  foreignKey: "staffId",
  as: "documents",
  onDelete: "CASCADE",
});

StaffDocument.belongsTo(Staff, {
  foreignKey: "staffId",
});

module.exports = StaffDocument;
