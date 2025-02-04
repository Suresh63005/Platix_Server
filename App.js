
const express = require("express");
const app = express();
const dotenv = require("dotenv");
// const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const { connectDB, sequelize } = require("./config/db");
const logger=require("morgan")
dotenv.config();
connectDB();


//routes
const adminRoutes = require("./AdminRoutes/AdminRoute");
const organizationtype=require("./AdminRoutes/OrganizationType.router")
const organization=require("./AdminRoutes/Organizations.router")


//model
const Admin = require("./Models/Adminmodel")
const TblOrganizationType=require("./Models/TblOrganizationType.model")
const TblRoles = require("./Models/TblRoles.model")
const TblServices = require("./Models/TblServices.model");
const Organization = require("./Models/Organization.model");

// Middleware
// app.use(morgan("dev"));
app.use(
  cors({
    origin: "http://localhost:3000", // Allow only frontend domain
    credentials: true, // Allow cookies & authentication headers
    methods: "GET,POST,PUT,DELETE", // Allowed HTTP methods
    allowedHeaders: "Content-Type,Authorization", // Allowed headers
  })
);
app.use(express.json());  // Use express.json() for parsing JSON requests
app.use(express.urlencoded({ extended: true }));  // Handle URL-encoded data

// Routes
app.use("/admin", adminRoutes);


// Test route
app.use(logger("dev"))
app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.use("/organization",organizationtype)
app.use("/api/organization",organization)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

sequelize
  .sync()
  .then(() => {
    console.log("Database & tables created!");
  })
  .catch((err) => {
    console.error("Unable to create the database:", err);
});