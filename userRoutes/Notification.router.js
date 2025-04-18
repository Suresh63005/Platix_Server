const express=require("express")
const router=express.Router()
const NotificationController=require("../userControllers/Notification.Controller")
const authMiddleWare=require("../Middlewares/auth")


router.post("/notifications/upsert",NotificationController.createNotification)
router.get("/notifications/get-notifications",authMiddleWare.isAuthenticated,NotificationController.getNotification) // here dentist,owner and delivery_boy get notifications
router.delete("/notifications/clear-all-notifications",authMiddleWare.isAuthenticated,NotificationController.clearAllNotifications) //// here dentist,owner and delivery_boy delte their notifications


module.exports=router