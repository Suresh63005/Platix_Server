const Notification = require("../Models/Notification.model");

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

  module.exports={createNotification}