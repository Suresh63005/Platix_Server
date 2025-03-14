const { DataTypes } = require("sequelize");
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
    orderId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    requiredDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    toothName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shades: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reasonForScan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    
    userUUID: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    fromOrganization: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    toOrganization: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    orderStatus: {
      type: DataTypes.ENUM( "processing", "completed", "cancelled"),
      allowNull: true,
    },
    mobileNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    subTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    serviceCharges: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    patientId: {
      type: DataTypes.STRING,
      allowNull: true,
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
