const express=require("express")
const router=express.Router()
const NotificationController=require("../userControllers/Notification.Controller")
const authMiddleWare=require("../Middlewares/auth")

router.post("/upsert",NotificationController.createNotification)
router.get("/get-notifications",authMiddleWare.verifyUser,NotificationController.getNotification)
router.delete("/clear-all-notifications",authMiddleWare.verifyUser,NotificationController.clearAllNotifications)

module.exports=router