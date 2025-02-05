const { DataTypes } = require('sequelize');
const { sequelize } = require("../config/db");
const Organization = require('./Organization.model');
const Services = require('./TblServices.model');

const TblOrganization_Service = sequelize.define("TblOrganization_Service", {
    id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Organization, 
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    service_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Services,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
}, {
      tableName: 'TblOrganization_Service' ,
      timestamps: true,
      paranoid: true,
      charset: "utf8mb4",
      collate: "utf8mb4_general_ci",
});

module.exports = TblOrganization_Service;
