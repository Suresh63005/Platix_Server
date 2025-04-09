const express=require("express")
const router=express.Router();
const deliveryBoyController=require("../../userControllers/DeliveryBoy/Delivery.Controller")
const authMiddleware=require("../../Middlewares/auth")
const dentistController=require("../../userControllers/Dentist/Dentist.Controller")

// this will working for order count , order search where order status is processing and orderlist also
router.get("/delivery/getall",authMiddleware.isAuthenticated,deliveryBoyController.getAll);
// get all order status wise (active || close || cancelled)
router.get("/delivery/getall-order/:orderStatus",authMiddleware.isAuthenticated,deliveryBoyController.deliveryAllOrders)

// specific details get by id
router.get("/delivery/order/getbyid/:id",authMiddleware.isAuthenticated,deliveryBoyController.orderDetailsGetById)

// upsert order
router.post("/delivery/upsert",authMiddleware.isAuthenticated,dentistController.fromDentist)

//closed order
router.get("/delivery/closed-order/:id", authMiddleware.isAuthenticated, deliveryBoyController.closedOrder);

module.exports=router