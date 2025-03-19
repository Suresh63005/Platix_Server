const express=require("express")
const router=express.Router()
const labrotoryController=require("../../userControllers/Labrotory/LabdDashboard.Controller")
const authMiddleware=require("../../Middlewares/auth")

router.get("/getall",authMiddleware.verifyUser,labrotoryController.labOrders);
// get all order status wise (active || close || cancelled)
router.get("/getall-order/:orderStatus",authMiddleware.verifyUser,labrotoryController.labAllOrders)

// it shown all order reports(order report and payment report) // this report should be order or payment
router.get("/order/report/:report",authMiddleware.verifyUser,labrotoryController.labOrderAndPaymentReport)
// retrieve id of order and payment report along with their specific details
router.get("/order/report/:id/:report",authMiddleware.verifyUser, labrotoryController.labOrderAndPaymentReportGetById)
router.get("/order/dashboard/search-orders",authMiddleware.verifyUser, labrotoryController.searchOrders);

// this will work for both order and payment reports
router.get("/order/payment/search-orders",authMiddleware.verifyUser,labrotoryController.searchOrders);

module.exports=router