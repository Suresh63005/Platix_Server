
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Organization = sequelize.define("Organization", {
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
  organizationType_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  googleCoordinates: {
    type: DataTypes.JSON, // ✅ Correct type for coordinates
    allowNull: false,
  },
  mobile: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  whatsapp: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  gstNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  registrationId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  file1: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  file2: {
    type: DataTypes.JSON, // ✅ Use JSON instead of TEXT[]
    allowNull: true,
  },
  admin_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accountHolder: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ifscCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  upiId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fromOrganization: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  toOrganization: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  // New columns
  admin_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accountHolder: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ifscCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  upiId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: "Organization",
  timestamps: true,
  paranoid: true,
  charset: "utf8mb4",
  collate: "utf8mb4_general_ci",
});

module.exports = Organization;
