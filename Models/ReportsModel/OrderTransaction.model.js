const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const orderTransaction = sequelize.define(
    "orderTransaction",
    {
        id: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        orderId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        userUUID: {
            type: DataTypes.UUID,
            allowNull: false
        },
        transactionId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },

    },
    {
        tableName: "orderTransaction",
        timestamps: true,
        paranoid: true,
        underscored: true,
        charset: "utf8mb4",
        collate: "utf8mb4_general_ci",
    }
);
module.exports = orderTransaction