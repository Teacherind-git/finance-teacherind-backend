const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const Tutor = require("./Tutor"); 

const TutorDocument = sequelizePrimary.define("tutor_document", {
  tutorId: { type: DataTypes.INTEGER, allowNull: false }, // now nullable
  fileName: { type: DataTypes.STRING, allowNull: false },
  filePath: { type: DataTypes.STRING, allowNull: false },
  fileType: { type: DataTypes.STRING, allowNull: true },
});

// Define the inverse association
Tutor.hasMany(TutorDocument, {
  foreignKey: "tutorId",
  as: "tutorDocuments",
  onDelete: "CASCADE",
});

TutorDocument.belongsTo(Tutor, {
  foreignKey: "tutorId",
});

module.exports = TutorDocument;
