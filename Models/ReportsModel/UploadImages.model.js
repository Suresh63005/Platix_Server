const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const UploadImages = sequelize.define('Images',{
    id:{
        type:DataTypes.UUID,
        primaryKey:true,
        allowNull:false
    },
    uid:{
        type:DataTypes.UUID,
        allowNull:false
    },
    order_id:{
        type:DataTypes.UUID,
        allowNull:false
    },
    images:{
        type:DataTypes.JSON,
        allowNull:false
    },
},{
    tableName:'UploadImages',timestamps:true,paranoid:true
})

module.exports = UploadImages