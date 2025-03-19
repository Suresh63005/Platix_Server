const express=require("express")
const router=express.Router();
const deliveryBoyController=require("../../userControllers/DeliveryBoy/Delivery.Controller")
const authMiddleware=require("../../Middlewares/auth")

router.get("/getall",deliveryBoyController.getAll);

module.exports=router