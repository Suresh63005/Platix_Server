
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const { connectDB, sequelize } = require("./config/db");
const logger=require("morgan")
dotenv.config();
connectDB();
//routes
const adminRoutes = require("./AdminRoutes/AdminRoute");
const organizationtype=require("./AdminRoutes/OrganizationType.router")

//model
const Admin = require("./Models/Adminmodel")
const TblOrganizationType=require("./Models/TblOrganizationType.model")


const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(logger("dev"))
app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.use("/organization",organizationtype)

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