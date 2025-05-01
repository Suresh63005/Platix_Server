const express=require("express")
const cashFreeController=require("../../userControllers/Payments/cashFree")
const authMiddleWare=require("../../Middlewares/auth")
const router=express.Router()

// it is working for both creating order and split amount between vendor and admin
router.post("/payment/create-order",authMiddleWare.isAuthenticated,cashFreeController.createOrder)
router.get("/payment/status/:order_id",authMiddleWare.isAuthenticated,cashFreeController.getPaymentByOrderId)
router.post("/payment/split-amount",authMiddleWare.isAuthenticated,cashFreeController.splitAmount)

module.exports=router