const express=require("express")
const router=express.Router()
const ownerController=require("../../userControllers/Owner/OwnerDashboard.Controller")
const authMiddleware=require("../../Middlewares/auth")

router.get("/dashboard",authMiddleware.isAuthenticated,ownerController.labOrders);
// get all order status wise (active || close || cancelled)
router.get("/getall-order/:orderStatus",authMiddleware.isAuthenticated,ownerController.labAllOrders)
// it shown all order reports(order report and payment report) // this report should be order or payment
router.get("/report/:report",authMiddleware.isAuthenticated,ownerController.labOrderAndPaymentReport)
// retrieve id of order and payment report along with their specific details
router.get("/order/report/:id/:report",authMiddleware.verifyUser, ownerController.labOrderAndPaymentReportGetById)
router.get("/order/dashboard/search-orders",authMiddleware.verifyUser, ownerController.searchOrders);
// this will work for both order and payment reports
router.get("/order/payment/search-orders",authMiddleware.verifyUser,ownerController.searchOrders);

module.exports=router