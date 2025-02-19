const { DataTypes } = require('sequelize');
const { sequelize } = require("../config/db");
const Organization = require('./Organization.model');
const Services = require('./TblServices.model');

const TblOrganization_Service = sequelize.define("Organization_Service", {
    id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    service_id: {
        type: DataTypes.UUID,
        allowNull: false,
       
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
}, {
      tableName: 'Organization_Service' ,
      timestamps: true,
      paranoid: true,
      charset: "utf8mb4",
      collate: "utf8mb4_general_ci",
});

module.exports = TblOrganization_Service;
