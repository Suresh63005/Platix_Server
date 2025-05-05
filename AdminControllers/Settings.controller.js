const uploadToS3 = require("../config/fileUpload.aws");
const Settings = require("../Models/TblSettings.model");

const getSettingsById = async (req, res) => {
  const admin = req.admin?.id;
    if (!admin) {
      return res.status(401).json({ message: "Unauthorized!" });
    }
  try {
    const { id } = req.params;
    const settings = await Settings.findByPk(id);

    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    res.status(200).json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createOrUpdateSettings = async (req, res) => {
  try {
    // Parse FormData fields
    const {
      id,
      notificationApiKey,
      smsGatewayApiKey,
      paymentGatewayApiKey,
      emailApiKey,
      whatsappApiKey,
      privacyPolicy,
      termsAndConditions,
      platformFee,
    } = req.body;

    console.log("Received FormData:", req.body); // Debugging

    let imgUrl;
    if (req.file) {
      imgUrl = await uploadToS3(req.file, "setting-images");
      console.log("Uploaded Image URL:", imgUrl); // Debugging
    }

    // Check if any settings record exists
    let settings = await Settings.findOne();

    if (settings) {
      // Update existing settings (even if no id is provided)
      console.log("Updating existing settings...");

      settings.image = imgUrl || settings.image;
      settings.notificationApiKey = notificationApiKey || settings.notificationApiKey;
      settings.smsGatewayApiKey = smsGatewayApiKey || settings.smsGatewayApiKey;
      settings.paymentGatewayApiKey = paymentGatewayApiKey || settings.paymentGatewayApiKey;
      settings.emailApiKey = emailApiKey || settings.emailApiKey;
      settings.whatsappApiKey = whatsappApiKey || settings.whatsappApiKey;
      settings.privacyPolicy = privacyPolicy || settings.privacyPolicy;
      settings.termsAndConditions = termsAndConditions || settings.termsAndConditions;
      settings.platformFee = platformFee || settings.platformFee;

      await settings.save();
      console.log("Updated settings:", settings);

      return res.status(200).json({ message: "Settings updated successfully", settings });
    } else {
      // Create new settings if no record exists
      console.log("Creating new settings...");

      settings = await Settings.create({
        image: imgUrl || null,
        notificationApiKey,
        smsGatewayApiKey,
        paymentGatewayApiKey,
        emailApiKey,
        whatsappApiKey,
        privacyPolicy,
        termsAndConditions,
        platformFee,
      });

      console.log("Created new settings:", settings);

      return res.status(201).json({ message: "Settings created successfully", settings });
    }
  } catch (error) {
    console.error("Error creating/updating settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const FetchSettings = async (req, res) => {
  try {
    const settings = await Settings.findAll();
    if (!settings || settings.length === 0) {
      return res.status(404).json({ message: "Settings not found" });
    }
    return res.status(200).json({ message: "Settings fetched successfully", settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const FetchSettingsById = async (req, res) => {
  try {
    const settings = await Settings.findOne();

    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    return res.status(200).json({ message: "Settings fetched successfully", settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getSettingsById, createOrUpdateSettings, FetchSettings, FetchSettingsById };