const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");
const TblOrganizationType = require("../TblOrganizationType.model");
const Organization = require("../Organization.model");
const TblRoles = require("../TblRoles.model");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  prefix: {
    type: DataTypes.ENUM("mr", "mrs"),
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
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
  mobileNo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  whatsappNo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role_id: { // ✅ Fixed: Referencing TblRoles as a UUID
    type: DataTypes.UUID,
    allowNull: false,
    
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  registrationId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  organizationType_id: {
    type: DataTypes.UUID,
    allowNull: false,
    
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
    
  },
}, {
  tableName: "User",
  timestamps: true,
  paranoid: true,
  charset: "utf8mb4",
  collate: "utf8mb4_general_ci",
});

module.exports = User;
