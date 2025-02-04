const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db'); // Import Sequelize instance

const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
  },
  googleCoordinates: {
    type: DataTypes.JSON,
  },
  mobile: {
    type: DataTypes.STRING,
  },
  whatsapp: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
  },
  gstNumber: {
    type: DataTypes.STRING,
  },
  designation: {
    type: DataTypes.STRING,
  },
  businessName: {
    type: DataTypes.STRING,
  },
  registrationId: {
    type: DataTypes.STRING,
  },
  file1: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  file2: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: "Organization",
  timestamps: true,
  paranoid: true,
  charset: "utf8mb4",
  collate: "utf8mb4_general_ci",
});

module.exports = Organization;
