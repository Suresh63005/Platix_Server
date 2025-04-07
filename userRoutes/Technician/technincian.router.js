const express = require('express');
const router = express.Router();
const technicianDashboard = require('../../userControllers/Technician/TechnicianDashboard.Controller');
const authMiddleware = require('../../Middlewares/auth');
const upload = require("../../utils/multer")

router.get("/technician/dashboard",authMiddleware.isAuthenticated,technicianDashboard.technicianDashboardData);
router.get("/technician/order-status",authMiddleware.isAuthenticated,technicianDashboard.FetchTechnicianOrdersByStatus);
router.get("/technician/order-details/:orderId",authMiddleware.isAuthenticated,technicianDashboard.ViewOrderDetails);
router.put("/technician",authMiddleware.isAuthenticated,technicianDashboard.CancelAndCloseOrder);
router.post("/technician/upload-images",authMiddleware.isAuthenticated,upload.array("images",5),technicianDashboard.UploadImagesByTechnician)
router.get("/technician/search",authMiddleware.isAuthenticated,technicianDashboard.SearchAPI)
router.get("/technician/orders/search",authMiddleware.isAuthenticated,technicianDashboard.TechnicianDashboardOrderSearch)
router.post("/clear-completed",authMiddleware.isAuthenticated,technicianDashboard.ClearAllCompletedOrders)
router.post("/clear-cancelled",authMiddleware.isAuthenticated,technicianDashboard.ClearAllCancelledOrders)

module.exports = router;