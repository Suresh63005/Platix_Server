const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");
const mysql2 = require('mysql2');

// Load environment variables from .env
dotenv.config();

// Create Sequelize instance
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: process.env.DB_DIALECT || "mysql", 
  logging: false, 
  timezone: process.env.TIMEZONE,
  dialectModule: require('mysql2')
});

// Test the database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1); // Exit process if connection fails
  }
};

// Export Sequelize instance & connection function
module.exports = { sequelize, connectDB };
