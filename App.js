const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const logger = require("morgan");
const swaggerUi = require("swagger-ui-express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");
const swaggerOptions = {
  customCssUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css",
  customJs: [
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js",
  ],
};

const { connectDB, sequelize } = require("./config/db");
require("./Models/associations");

dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5001;

// Connect to Database
connectDB();

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: "Too many requests, please try again later." },
  headers: true,
});

// Middleware
app.use(helmet());
app.use(limiter);
app.use(logger("dev"));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "https://platix-client.vercel.app",
      "https://platix-server.vercel.app"
    ],
    credentials: true,
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  })
);
app.use(express.json());
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ✅ Correctly load Swagger JSON
const swaggerFilePath = path.join(__dirname, "Swagger", "swagger-output.json");
const swaggerDocument = fs.existsSync(swaggerFilePath)
  ? require(swaggerFilePath)
  : { swagger: "2.0", info: { title: "API Docs", version: "1.0.0" } };

// ✅ Serve Swagger UI & Fix Static Files Issue
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument,swaggerOptions));
app.use(
  "/api-docs",
  express.static(path.join(__dirname, "node_modules/swagger-ui-dist"))
);

/// Admin Routes
app.use( require("./AdminRoutes/AdminRoute"));
app.use( require("./AdminRoutes/OrganizationType.router"));
app.use( require("./AdminRoutes/Organizations.router"));
app.use( require("./AdminRoutes/User.router"));
app.use( require("./AdminRoutes/ReportUser/Reports"));

// Mobile Routes
app.use( require("./userRoutes/auth/authRouter"));
app.use( require("./userRoutes/DashBoard.router"));
app.use( require("./userRoutes/Profile.router"));
app.use( require("./userRoutes/Dentist/Dentist.router"));
app.use( require("./userRoutes/Owner/Owner.router"));
app.use( require("./userRoutes/Delivery/Delivery.router"));
app.use( require("./userRoutes/Notification.router"));
app.use(require('./userRoutes/Technician/technincian.router'));
// ✅ Test Route
app.get("/", (req, res) => res.send("Server is running..."));

// ✅ 404 Not Found Handler
app.use("*", (req, res) => res.status(404).json({ message: "Route not found" }));

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// ✅ Sync Database
sequelize
  .sync()
  .then(() => console.log("✅ Database & tables created!"))
  .catch((err) => console.error("❌ Unable to create database:", err));