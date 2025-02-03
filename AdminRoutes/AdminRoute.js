const express = require("express");
const { registerAdmin, loginAdmin, adminDashboard } = require("../AdminControllers/AdminController");
const { verifyAdmin } = require("../Middlewares/auth");


const router = express.Router();

// Admin registration route
router.post("/register", registerAdmin);

// Admin login route
router.post("/login", loginAdmin);

// Admin protected route (e.g., Admin Dashboard)
router.get("/organization", verifyAdmin, adminDashboard);

module.exports = router;
