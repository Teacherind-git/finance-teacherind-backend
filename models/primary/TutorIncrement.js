const { DataTypes } = require('sequelize');
const { sequelizePrimary } = require('../config/db');

const TutorIncrement = sequelizePrimary.define('TutorIncrement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tutorRuleId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  classRange: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  incrementPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
}, {
  tableName: 'tutor_increments',
  timestamps: true,
});

module.exports = TutorIncrement;
