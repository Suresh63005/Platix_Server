
const express = require("express");
const app = express();
const dotenv = require("dotenv");
// const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const { connectDB, sequelize } = require("./config/db");
const logger=require("morgan")
const PORT = process.env.PORT || 5000
// const PORT2 = process.env.PORT2 || 8081
require("./Models/associations")
dotenv.config();
connectDB();

// const UserRouter=require("./AdminRoutes/ReportUser/User.router")

//routes
const adminRoutes = require("./AdminRoutes/AdminRoute");
const organizationtype=require("./AdminRoutes/OrganizationType.router")
const organization=require("./AdminRoutes/Organizations.router")
// const UserReport=require("./AdminRoutes/ReportUser/Reports")
const UserRouter=require("./AdminRoutes/User.router")
const OrderRouter=require("./AdminRoutes/ReportUser/Reports")


const Admin = require("./Models/Adminmodel")
const TblOrganizationType=require("./Models/TblOrganizationType.model")
const TblRoles = require("./Models/TblRoles.model")
const TblServices = require("./Models/TblServices.model");
const Organization = require("./Models/Organization.model");
const Settings = require("./Models/Settings.model");
const User = require("./Models/ReportsModel/User.model");
const OrderReport = require("./Models/ReportsModel/OrderReport.model");

// Middleware
// app.use(morgan("dev"));
app.use(
  cors({
    origin:[ "http://localhost:3000","https://platix-client.vercel.app"],
    credentials: true,
    methods: "GET,POST,PUT,DELETE", 
    allowedHeaders: "Content-Type,Authorization", 
  })
);
app.use(express.json());  // Use express.json() for parsing JSON requests
app.use(express.urlencoded({ limit: '10mb', extended: true }));  // Handle URL-encoded data

// Routes
app.use("/admin", adminRoutes);


// Test route
app.use(logger("dev"))
app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.use("/organization",organizationtype)
app.use("/api/organization",organization)
// app.use("/api/service",organization)
app.use("/user",UserRouter)
app.use("/order",OrderRouter)




// for mobile
app.use("/login",require("./userRoutes/auth/authRouter"))
app.use("/dashboard",require("./userRoutes/DashBoard.router"))
app.use("/profile",require("./userRoutes/Profile.router"))
app.use("/dentist",require("./userRoutes/Dentist/Dentist.router"))
app.use("/notifications",require("./userRoutes/Notification.router"))

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// app.listen(PORT2, () => {
//   console.log(`Server running on port ${PORT2}`);
// });

sequelize
  .sync()
  .then(() => {
    console.log("Database & tables created!");
  })
  .catch((err) => {
    console.error("Unable to create the database:", err);
});

// 🚀 Welcome to Day 11 of our 30-day JavaScript Interview Prep!
// 📌 Today's Challenge: Finding the Maximum Repeated Value
// Given an array, our goal is to find the element that appears the most times. Let's solve it efficiently!
let a = [1, 2, 3, 4, 4, 4, 3, 4, 5]; 
let output = {}; 
let maxRepeat = 0; 
let maxValue = null; 

for (let i = 0; i < a.length; i++) { 
 output[a[i]] = (output[a[i]] || 0) + 1; 

 if (output[a[i]] > maxRepeat) { 
 maxRepeat = output[a[i]]; 
 maxValue = a[i]; 
 } 
} 

console.log(maxValue); // Output: 4