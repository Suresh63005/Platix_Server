const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Roles = sequelize.define(
    "TblRoles",
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4, // Corrected
      },
      rolename: {
        type: DataTypes.STRING,
        unique: true,
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
    },
    {
      tableName: "TblRoles",
      timestamps: true,
      paranoid: true, // Soft deletes: includes deletedAt field
      charset: "utf8mb4",
      collate: "utf8mb4_general_ci",
    }
  );
  
  module.exports = Roles