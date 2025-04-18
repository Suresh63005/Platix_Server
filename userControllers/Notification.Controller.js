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
        raw: true,  // Get plain data without the Sequelize model wrapper
      });
  
      const formattedNotifications = notifications.map((notification) => {
        const localCreatedAt = moment.utc(notification.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
        notification.createdAt = localCreatedAt;
  
        // Handle deletedAt: if it's invalid or null, return null
        if (!notification.deletedAt || isNaN(new Date(notification.deletedAt))) {
          notification.deletedAt = null;
        } else {
          const localDeletedAt = moment.utc(notification.deletedAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
          notification.deletedAt = localDeletedAt;
        }
  
        return notification;
      });
  
      return res.status(200).json({
        success: true,
        notifications: formattedNotifications
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message
      });
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