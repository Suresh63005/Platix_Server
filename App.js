const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const logger = require("morgan");
const swaggerUi = require("swagger-ui-express");
const rateLimit = require("express-rate-limit")

const { connectDB, sequelize } = require("./config/db");

const logger=require("morgan")
const PORT = process.env.PORT || 5000
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require("./Swagger/swagger-output.json");
// const PORT2 = process.env.PORT2 || 8081 
require("./Models/associations")

dotenv.config();

// Initialize Express
const app = express();


// Connect to Database
connectDB();

const limiter=rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: { error: "Too many requests, please try again later." },
  headers: true,
})

// Middleware
app.use(limiter);
app.use(logger("dev"));
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "https://platix-eight.vercel.app"
  ],
  credentials: true,
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));
app.use(express.json());
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Swagger API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(require("./Swagger/swagger-output.json")));

// Admin Routes
app.use("/admin", require("./AdminRoutes/AdminRoute"));
app.use("/organization", require("./AdminRoutes/OrganizationType.router"));
app.use("/api/organization", require("./AdminRoutes/Organizations.router"));
app.use("/user", require("./AdminRoutes/User.router"));
app.use("/order", require("./AdminRoutes/ReportUser/Reports"));

// Mobile Routes
app.use("/login", require("./userRoutes/auth/authRouter"));
app.use("/dashboard", require("./userRoutes/DashBoard.router"));
app.use("/profile", require("./userRoutes/Profile.router"));
app.use("/dentist", require("./userRoutes/Dentist/Dentist.router"));
app.use("/labrotory", require("./userRoutes/Labrotory/lab.router"));
app.use("/delivery", require("./userRoutes/Delivery/Delivery.router"));
app.use("/notifications", require("./userRoutes/Notification.router"));

// Test Route
app.get("/", (req, res) => res.send("Server is running..."));

// 404 Not Found Handler
app.use("*", (req, res) => res.status(404).json({ message: "Route not found" }));

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Sync Database 
sequelize.sync()
  .then(() => console.log("✅ Database & tables created!"))
  .catch((err) => console.error("❌ Unable to create database:", err));
