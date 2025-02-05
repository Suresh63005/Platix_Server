const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Services = sequelize.define("TblServices", {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  servicename: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  servicedescription: {
    type: DataTypes.TEXT, 
    allowNull: false,
  },
  fromdate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  todate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

module.exports = Services;
