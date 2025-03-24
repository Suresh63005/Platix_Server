const express=require("express")
const router=express.Router()
const NotificationController=require("../userControllers/Notification.Controller")
const authMiddleWare=require("../Middlewares/auth")

router.post("/notifications/upsert",NotificationController.createNotification)
router.get("/notifications/get-notifications",authMiddleWare.verifyUser,NotificationController.getNotification)
router.delete("/notifications/clear-all-notifications",authMiddleWare.verifyUser,NotificationController.clearAllNotifications)

module.exports=router