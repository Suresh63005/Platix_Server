const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Settings = sequelize.define("Settings", {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  image: { 
    type: DataTypes.TEXT('long'), 
    allowNull: true,
  },
  notificationApiKey: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  smsGatewayApiKey: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paymentGatewayApiKey: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emailApiKey: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  whatsappApiKey: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  privacyPolicy: { 
    type: DataTypes.TEXT,
    allowNull: true,
  },
  termsAndConditions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: "Settings",
  timestamps: true,
  paranoid: true,
  charset: "utf8mb4",
  collate: "utf8mb4_general_ci",
});

module.exports = Settings;