const Settings = require("../Models/TblSettings.model");

const getSettingsById = async (req, res) => {
  try {
    const { id } = req.params;
    const settings = await Settings.findByPk(id);

    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createOrUpdateSettings = async (req, res) => {
  try {
    const {
      id,
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
      settings = await Settings.findByPk(id);
    } else {
      settings = await Settings.findOne();
    }

    if (settings) {
      settings.websiteImage = req.file ? req.file.path : settings.websiteImage;
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

    settings = await Settings.create({
      websiteImage: req.file ? req.file.path : null,
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

const FetchSettings = async (req, res) => {
  try {
    const settings = await Settings.findAll();
    if (!settings) {
      return res.status(404).json({ message: "Settings not found!" });
    }
    return res.status(201).json({ message: "Settings fetched successfully!", settings });
  } catch (error) {
    console.error("Error Fetched Settings", error);
    return res.status(500).json({ message: "Internal server error!" });
  }
};

const FetchSettingsById = async (req, res) => {
  try {
    const { id } = req.params;
    const settings = await Settings.findByPk(id);
    if (!settings) {
      return res.status(404).json({ message: "Settings not found!" });
    }
    return res.status(201).json({ message: "Settings fetched successfully!", settings });
  } catch (error) {
    console.error("Error Fetched Settings", error);
    return res.status(500).json({ message: "Internal server error!" });
  }
};

module.exports = { getSettingsById, createOrUpdateSettings, FetchSettings, FetchSettingsById };