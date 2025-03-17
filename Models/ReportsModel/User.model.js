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
    type: DataTypes.ENUM("mr", "ms", "mrs", "dr"),
    allowNull: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  mobileNo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  whatsappNo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role_id: {
    type: DataTypes.UUID,
    allowNull: true,
    
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  registrationId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  organizationType_id: {
    type: DataTypes.UUID,
    allowNull: true,
    
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: true,
    
  },
  profileImage: {
    type: DataTypes.TEXT,
    allowNull:true
  },
  hospital_name: {
    type: DataTypes.TEXT,
    allowNull:true
  },
  googleMapLink: {
    type:DataTypes.TEXT,
    allowNull:true
  },
  type: {
    type: DataTypes.STRING,
    allowNull:true
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  
}, {
  tableName: "User",
  timestamps: true,
  paranoid: true,
  charset: "utf8mb4",
  collate: "utf8mb4_general_ci",
});

module.exports = User;
