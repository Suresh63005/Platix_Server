const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,     
  process.env.DB_USER,     
  process.env.DB_PASSWORD, 
  {
    host: process.env.DB_HOST,      
    port: process.env.DB_PORT,      
    dialect: process.env.DB_DIALECT || "mysql", 
  }
);

// JWT and session secrets
const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;

module.exports = { sequelize, JWT_SECRET, SESSION_SECRET };
