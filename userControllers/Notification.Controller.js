const Notification = require("../Models/Notification.model");
const moment = require('moment');

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
        raw: true,  
      });
  
      const formattedNotifications = notifications.map((notification) => {
        notification.createdAt = moment(notification.createdAt).local().format('YYYY-MM-DD HH:mm:ss');
        notification.updatedAt = moment(notification.updatedAt).local().format('YYYY-MM-DD HH:mm:ss');
        notification.datetime = moment(notification.datetime).local().format('YYYY-MM-DD HH:mm:ss');
        notification.deletedAt = moment(notification.deletedAt).local().format('YYYY-MM-DD HH:mm:ss');
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