const express=require("express")
const router=express.Router()
const NotificationController=require("../userControllers/Notification.Controller")
const authMiddleware=require("../Middlewares/auth")

router.post("/upsert",NotificationController.createNotification)
router.get("/get-notifications",authMiddleware.isAuthenticated,NotificationController.getNotification)
router.delete("/clear-all-notifications",authMiddleware.isAuthenticated,NotificationController.clearAllNotifications)

module.exports=router