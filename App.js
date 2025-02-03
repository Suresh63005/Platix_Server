const express = require("express");
const app = express();
const dotenv = require("dotenv");
const morgan = require("morgan");
const cors = require("cors");
const { connectDB,sequelize } = require("./config/db");
const adminRoutes = require("./AdminRoutes/AdminRoute");
const Admin = require("./Models/Adminmodel")

dotenv.config();
connectDB();

// Middleware
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());  // Use express.json() for parsing JSON requests
app.use(express.urlencoded({ extended: true }));  // Handle URL-encoded data

// Routes
app.use("/admin", adminRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Server is running...");
});

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