const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const TblOrganizationType = sequelize.define(
  "OrganizationType",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4, 
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
    service_id: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    }
  },
  {
    tableName: "OrganizationType",
    timestamps: true,
    paranoid: true,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = TblOrganizationType;
