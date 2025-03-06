const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Services = sequelize.define("Services", {
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
    allowNull: true,
  },
},
{
  tableName: "Services",
  timestamps: true,
  paranoid: true, 
  charset: "utf8mb4",
  collate: "utf8mb4_general_ci",
});

module.exports = Services;
