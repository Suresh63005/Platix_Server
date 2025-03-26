const express = require('express');
const router = express.Router();
const technicianDashboard = require('../../userControllers/Technician/TechnicianDashboard.Controller');
const authMiddleware = require('../../Middlewares/auth');

router.get("/technician/dashboard",authMiddleware.isAuthenticated,technicianDashboard.technicianDashboardData);
router.get("/technician/order-status",authMiddleware.isAuthenticated,technicianDashboard.FetchTechnicianOrdersByStatus);
router.get("/technician/order-details/:orderId",authMiddleware.isAuthenticated,technicianDashboard.ViewOrderDetails)

module.exports = router;