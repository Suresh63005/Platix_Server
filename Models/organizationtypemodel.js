// Sequelize Model: OrganizationType
const { DataTypes } = require('sequelize');
const {sequelize} = require('./db');

const OrganizationType = sequelize.define('OrganizationType', {
  type: {
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

module.exports = OrganizationType;
