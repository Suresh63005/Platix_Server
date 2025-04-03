const express=require("express")
const router=express.Router()
const NotificationController=require("../userControllers/Notification.Controller")
const authMiddleWare=require("../Middlewares/auth")

router.post("/notifications/upsert",authMiddleWare.isAuthenticated,NotificationController.createNotification)
router.get("/notifications/get-notifications",authMiddleWare.isAuthenticated,NotificationController.getNotification)
router.delete("/notifications/clear-all-notifications",authMiddleWare.isAuthenticated,NotificationController.clearAllNotifications)

module.exports=router