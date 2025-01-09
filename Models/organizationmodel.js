const { DataTypes } = require("sequelize");
const { sequelize } = require("./db"); // Correct import of sequelize instance

const Organization = sequelize.define("Organization", {
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
    allowNull: true,
  },
  googleCoordinates: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mobileNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  whatsappNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  images: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  registrationId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  gstNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  serviceName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  servicePrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
});

module.exports = Organization;
