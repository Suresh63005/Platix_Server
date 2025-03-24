const express=require("express")
const router=express.Router();
const deliveryBoyController=require("../../userControllers/DeliveryBoy/Delivery.Controller")
const authMiddleware=require("../../Middlewares/auth")

router.get("/getall",authMiddleware.isAuthenticated,deliveryBoyController.getAll);
// get all dashboard search by organization name and order id
router.get("/dashboard/:search",authMiddleware.isAuthenticated,deliveryBoyController.dashboardSearch)
// get all order status wise (active || close || cancelled)
router.get("/getall-order/:orderStatus",authMiddleware.isAuthenticated,deliveryBoyController.deliveryAllOrders)

// specific details get by id
router.get("/order/getbyid/:id",authMiddleware.isAuthenticated,deliveryBoyController.orderDetailsGetById)

// upsert order
router.post("/order/upsert",authMiddleware.isAuthenticated,deliveryBoyController.upsert)
module.exports=router