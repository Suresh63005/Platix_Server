const { Settings } = require("../Models/TblSettings.model");

// Get settings by ID
const getSettingsById = async (req, res) => {
  try {
    const { id } = req.params; // Get ID from request params
    const settings = await Settings.findByPk(id); // Find by primary key

    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create or Update settings (same logic)
const createOrUpdateSettings = async (req, res) => {
  try {
    const {
      id, // Now accepting ID for updates
      websiteImage,
      notificationApiKey,
      smsApiKey,
      paymentApiKey,
      emailApiKey,
      whatsappApiKey,
      privacyContent,
      termsContent,
    } = req.body;

    let settings;

    if (id) {
      // Check if settings exist by ID
      settings = await Settings.findByPk(id);
    } else {
      // If no ID provided, find the first settings entry
      settings = await Settings.findOne();
    }

    if (settings) {
      // Update existing settings
      settings.websiteImage = websiteImage || settings.websiteImage;
      settings.notificationApiKey = notificationApiKey || settings.notificationApiKey;
      settings.smsApiKey = smsApiKey || settings.smsApiKey;
      settings.paymentApiKey = paymentApiKey || settings.paymentApiKey;
      settings.emailApiKey = emailApiKey || settings.emailApiKey;
      settings.whatsappApiKey = whatsappApiKey || settings.whatsappApiKey;
      settings.privacyContent = privacyContent || settings.privacyContent;
      settings.termsContent = termsContent || settings.termsContent;

      await settings.save();
      return res.json({ message: "Settings updated successfully", settings });
    }

    // Create new settings if not found
    settings = await Settings.create({
      websiteImage,
      notificationApiKey,
      smsApiKey,
      paymentApiKey,
      emailApiKey,
      whatsappApiKey,
      privacyContent,
      termsContent,
    });

    res.json({ message: "Settings created successfully", settings });

  } catch (error) {
    console.error("Error creating/updating settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getSettingsById, createOrUpdateSettings };
