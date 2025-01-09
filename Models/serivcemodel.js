// Sequelize Model: Service
const { DataTypes } = require('sequelize');
const {sequelize} = require('./db');

const Service = sequelize.define('Service', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fromDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  toDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = Service;
