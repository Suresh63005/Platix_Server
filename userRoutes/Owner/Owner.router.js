const express=require("express")
const router=express.Router()
const ownerController=require("../../userControllers/Owner/OwnerDashboard.Controller")
const authMiddleware=require("../../Middlewares/auth")

router.get("/owner/dashboard",authMiddleware.isAuthenticated,ownerController.labOrders);
// get all order status wise (active || close || cancelled)
router.get("/owner/getall-order/:orderStatus",authMiddleware.isAuthenticated,ownerController.labAllOrders)
// it shown all order reports(order report and payment report) // this report should be order or payment
router.get("/owner/report/:report",authMiddleware.isAuthenticated,ownerController.labOrderAndPaymentReport)
// retrieve id of order and payment report along with their specific details
router.get("/owner/order/report/:id/:report",authMiddleware.isAuthenticated, ownerController.labOrderAndPaymentReportGetById)
router.get("/owner/order/dashboard/search-orders",authMiddleware.isAuthenticated, ownerController.searchOrders);
// this will work for both order and payment reports
router.get("/owner/order/payment/search-orders",authMiddleware.isAuthenticated,ownerController.searchOrders);

module.exports=router