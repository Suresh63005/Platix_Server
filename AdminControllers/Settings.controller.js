const uploadToS3 = require("../config/fileUpload.aws");
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
      smsGatewayApiKey,
      paymentGatewayApiKey,
      emailApiKey,
      whatsappApiKey,
      privacyPolicy,
      termsAndConditions,
      platformFee
    } = req.body;

    console.log(req.body); // Debugging

    let imgUrl;

    if (req.file) {
      imgUrl = await uploadToS3(req.file, "setting-images");
      console.log(imgUrl, "✅ Uploaded Image URL"); // Debugging
    }

    console.log(req.file, "📸 Received Image File");

    // If `id` is provided, update the existing settings; otherwise, create new settings
    let settings;

    if (id) {
      // Update existing settings
      console.log("🔄 Updating existing settings...");

      settings = await Settings.findByPk(id);

      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }

      settings.image = imgUrl || settings.image;  // Use `image` instead of `websiteImage`
      settings.notificationApiKey = notificationApiKey || settings.notificationApiKey;
      settings.smsGatewayApiKey = smsGatewayApiKey || settings.smsGatewayApiKey;
      settings.paymentGatewayApiKey = paymentGatewayApiKey || settings.paymentGatewayApiKey;
      settings.emailApiKey = emailApiKey || settings.emailApiKey;
      settings.whatsappApiKey = whatsappApiKey || settings.whatsappApiKey;
      settings.privacyPolicy = privacyPolicy || settings.privacyPolicy;
      settings.termsAndConditions = termsAndConditions || settings.termsAndConditions;
      settings.platformFee = platformFee || settings.platformFee;

      await settings.save();
      console.log(settings, "✅ Updated settings after save");

      return res.json({ message: "Settings updated successfully", settings });
    } else {
      // Create new settings if `id` is not provided
      console.log("🆕 Creating new settings...");

      settings = await Settings.create({
        image: imgUrl || null,  // Use `image` instead of `websiteImage`
        notificationApiKey,
        smsGatewayApiKey,
        paymentGatewayApiKey,
        emailApiKey,
        whatsappApiKey,
        privacyPolicy,
        termsAndConditions,
        platformFee
      });

      console.log(settings, "✅ Created new settings");

      return res.json({ message: "Settings created successfully", settings });
    }
  } catch (error) {
    console.error("❌ Error creating/updating settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const FetchSettings = async (req, res) => {
  try {
    const settings = await Settings.findAll();
    if (!settings || settings.length === 0) {
      return res.status(404).json({ message: "Settings not found!" });
    }
    return res.status(200).json({ message: "Settings fetched successfully!", settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res.status(500).json({ message: "Internal server error!" });
  }
};

const FetchSettingsById = async (req, res) => {
  try {
    const settings = await Settings.findOne(); // Fetches the first record

    if (!settings) {
      return res.status(404).json({ message: "Settings not found!" });
    }

    return res.status(200).json({ message: "Settings fetched successfully!", settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res.status(500).json({ message: "Internal server error!" });
  }
};
module.exports = { getSettingsById, createOrUpdateSettings, FetchSettings, FetchSettingsById };