const express=require("express")
const router=express.Router()
const labrotoryController=require("../../userControllers/Labrotory/LabdDashboard.Controller")
const authMiddleware=require("../../Middlewares/auth")

router.get("/getall",authMiddleware.isAuthenticated,labrotoryController.labOrders);
// get all order status wise (active || close || cancelled)
router.get("/getall-order/:orderStatus",authMiddleware.isAuthenticated,labrotoryController.labAllOrders)

// it shown all order reports(order report and payment report) // this report should be order or payment
router.get("/order/report/:report",authMiddleware.isAuthenticated,labrotoryController.labOrderAndPaymentReport)
// retrieve id of order and payment report along with their specific details
router.get("/order/report/:id/:report",authMiddleware.isAuthenticated, labrotoryController.labOrderAndPaymentReportGetById)
router.get("/order/dashboard/search-orders",authMiddleware.isAuthenticated, labrotoryController.searchOrders);

// this will work for both order and payment reports
router.get("/order/payment/search-orders",authMiddleware.isAuthenticated,labrotoryController.searchOrders);

module.exports=router