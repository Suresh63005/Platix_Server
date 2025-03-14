const express=require("express")
const router=express.Router()
const labrotoryController=require("../../userControllers/Labrotory/LabdDashboard.Controller")

router.get("/getall",labrotoryController.labOrders);
// get all order status wise (active || close || cancelled)
router.get("/getall-order/:orderStatus",labrotoryController.labAllOrders)

// it shown all order reports(order report and payment report) // this report should be order or payment
router.get("/order/report/:report",labrotoryController.labOrderAndPaymentReport)
// retrieve id of order and payment report along with their specific details
router.get("/order/report/:id/:report", labrotoryController.labOrderAndPaymentReportGetById)

module.exports=router