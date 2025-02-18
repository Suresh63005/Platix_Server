const express=require("express")
const router=express.Router()
const NotificationController=require("../userControllers/Notification.Controller")

router.post("/upsert",NotificationController.createNotification)
module.exports=router