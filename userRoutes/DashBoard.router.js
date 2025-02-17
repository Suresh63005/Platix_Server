const express=require("express")
const router=express.Router();
const dashBoardController=require("../userControllers/DashBoard.Controller")

router.get("/all-orders",dashBoardController.allOrders)
router.get("/all",dashBoardController.all)
router.get("/status/:status/:from_organization",dashBoardController.statusOrder)

module.exports=router