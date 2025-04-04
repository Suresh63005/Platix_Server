const Notification = require("../Models/Notification.model");
const moment = require('moment-timezone');

const createNotification = async (req, res) => {
    const { uid, datetime, title, description } = req.body;
  
    try {
      const notification = await Notification.create({
        uid,
        datetime,
        title,
        description,
      });
  
      res.status(201).json({ message: "Notification created", data: notification });
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  };

  const getNotification = async (req, res) => {
    const { id } = req.user;
    try {
      const notifications = await Notification.findAll({
        where: { uid: id, deletedAt: null },
        raw: true,  // Get plain data to manipulate the date
      });
  
      const formattedNotifications = notifications.map((notification) => {
        // Convert the createdAt to local time using moment-timezone
        const localTime = moment(notification.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
        notification.createdAt = localTime;
        return notification;
      });
  
      return res.status(200).json({ success: true, notifications: formattedNotifications });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
  };

  // for clear notifications 
  const clearAllNotifications=async(req,res)=>{
    const  {id}=req.user;
    try {
      const notifications=await Notification.destroy({
        where:{uid:id},
      })
      return res.status(200).json({success:true,notifications})
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ success: false,  message: "Internal Server Error",  error: error.message });
    }
  }

  module.exports={createNotification,getNotification,clearAllNotifications}