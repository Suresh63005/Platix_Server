const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const OrderServices = sequelize.define(
  "OrderServices",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    orgserviceId: {
      type: DataTypes.UUID, 
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER, 
      allowNull: false,
      defaultValue: 1, 
    },
    price: {
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false,
    },
  },
  {
    tableName: "OrderServices",
    timestamps: true,
    paranoid: true,
    underscored: true,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = OrderServices;
