const express = require('express');
const router = express.Router();
const technicianDashboard = require('../../userControllers/Technician/TechnicianDashboard.Controller');
const authMiddleware = require('../../Middlewares/auth');

router.get("/dashboard",authMiddleware.isAuthenticated,technicianDashboard.technicianDashboardData)

module.exports = router;