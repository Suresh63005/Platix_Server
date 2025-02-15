const express=require("express")
const router=express.Router();
const dashBoardController=require("../userControllers/DashBoard.Controller")

router.get("/all-orders",dashBoardController.allOrders)
router.get("/all",dashBoardController.all)

module.exports=router