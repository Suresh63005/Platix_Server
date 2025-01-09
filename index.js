const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const { sequelize } = require("./Models/db");


// Import sequelize connection and models
const Organization = require("./Models/organizationmodel");
const OrganizationType = require("./Models/organizationtypemodel");
const Service = require("./Models/serivcemodel");
const User = require('./Models/usermodel');
const Relationships = require('./Models/Relationships');

// Import relationships setup

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(cors());  // Enable Cross-Origin Resource Sharing (CORS)
app.use(bodyParser.json());  // For parsing application/json

// Test the database connection
sequelize.authenticate()
  .then(() => {
    console.log("Database connection successful.");
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });

// Sync the models and create the tables
sequelize
  .sync()
  .then(() => {
    console.log("Database & tables created!");
  })
  .catch((err) => {
    console.error("Unable to create the database:", err);
  });

// Basic route for the API
app.get("/", (req, res) => {
  res.send("Hello, this is the Express API!");
});

// Example route to check if server is running
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
