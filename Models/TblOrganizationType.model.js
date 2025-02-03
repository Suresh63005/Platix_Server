const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const TblOrganizationType = sequelize.define(
    "TblOrganizationType", {
        id: {
            type: DataTypes.UUID,  
            allowNull: false,
            primaryKey: true,
            defaultValue: uuidv4,
        },
        organizationType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        fromDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        toDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        tableName: "TblOrganizationType",
        timestamps: true,
        paranoid: true,
        charset: "utf8mb4", // Correct charset for utf8mb4 encoding
        collate: "utf8mb4_general_ci", // Correct collation for utf8mb4
    }
);

module.exports = TblOrganizationType;
