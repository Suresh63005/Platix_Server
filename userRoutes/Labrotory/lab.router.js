const express=require("express")
const router=express.Router()
const labrotoryController=require("../../userControllers/Labrotory/LabdDashboard.Controller")

router.get("/getall",labrotoryController.labOrders);
module.exports=router