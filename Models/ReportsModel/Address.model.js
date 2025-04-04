const { sequelize } = require("../../config/db");

const Address=sequelize.define(
    "Address",
    {
        id:{
            type:DataTypes.UUID,
            allowNull:false,
            primaryKey:true,
            defaultValue:DataTypes.UUIDV4
        },
        userId:{
            type:DataTypes.UUID,
            allowNull:true,
        },
        address:{
            type:DataTypes.STRING,
            allowNull:true,
        },
    },
    {
        tableName:"Address",
        timestamps:true,
        paranoid:true,
        underscored:true,
        charset:"utf8mb4",
        collateSet:"utf8mb4_general_ci",
    }
)

module.exports=Address