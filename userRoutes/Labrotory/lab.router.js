const express=require("express")
const router=express.Router()
const labrotoryController=require("../../userControllers/Labrotory/LabdDashboard.Controller")

router.get("/getall",labrotoryController.labOrders);
// get all order status wise (active || close || cancelled)
router.get("/getall-order/:orderStatus",labrotoryController.labAllOrders)
module.exports=router