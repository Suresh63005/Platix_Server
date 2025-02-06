const { DataTypes } = require("sequelize");
const UserReports = require("./User.model");
const Organization = require("../Organization.model");
const { sequelize } = require("../../config/db");

const OrderReports = sequelize.define(
  "OrderReports",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    orderDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    userUUID: {
      type: DataTypes.UUID,
      allowNull: false,
      
    },
    fromOrganization: {
      type: DataTypes.UUID,
      allowNull: false,
      
    },
    toOrganization: {
      type: DataTypes.UUID,
      allowNull: false,
      
    },
    orderStatus: {
      type: DataTypes.ENUM("pending", "processing", "completed", "cancelled"),
      allowNull: false,
    },
    mobileNo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    serviceCharges: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    patientName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    patientAge: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    patientGender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    patientProblem: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "OrderReports",
    timestamps: true,
    paranoid: true,
    underscored: true, 
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = OrderReports;
