const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Vendor = sequelize.define(
  "Vendor",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    organizationId:{
        type: DataTypes.UUID,
        allowNull: true,
    },
    aadhaar: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "aadhaar", 
    },
    pan: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      },
    },
    gst: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 
      },
    },
    cin: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    accountType: {
      type: DataTypes.ENUM("Individual"),
      allowNull: false,
    },
    businessType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    drivingLicense: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "driving_license",
    },
    voterId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "voter_id",
    },
    passportNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "passport_number",
    },
  },
  {
    tableName: "vendors", 
    timestamps: true,
    paranoid: true, 
    underscored: true,
  }
);

module.exports = Vendor;
