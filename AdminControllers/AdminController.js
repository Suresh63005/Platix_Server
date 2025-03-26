const Admin = require("../Models/Adminmodel");
const jwt = require('jsonwebtoken');
const {sendEmail} = require('../utils/sendEmail'); 
const { generateToken } = require('../Middlewares/auth');
const uploadToS3 = require("../config/fileUpload.aws");
const registerSchema = require("../Middlewares/validation")


// Admin registration controller
const registerAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the admin already exists
    const existingAdmin = await Admin.findOne({ where: { email } });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists with this email." });
    }

    // Create a new admin with hashed password
    const newAdmin = await Admin.create({
      email,
      password,
      userType: 'admin',
    });

    // Generate token for the newly registered admin
    const token = generateToken(newAdmin);
    res.status(201).json({ message: "Admin registered successfully.", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the admin by email
    const admin = await Admin.findOne({ where: { email } });

    // Check if the admin exists
    if (!admin) {
      return res.status(404).json({ message: "This Mail ID is not associated as Admin" });
    }

    // Check if the password matches the hashed password
    const isPasswordValid = await admin.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // Generate JWT token
    const token = generateToken(admin);
    return res.json({ message: "Login successful", token });

  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


const getAdminProfile = async (req, res) => {
  
  try {
    const admin = await Admin.findByPk(req.admin.id, {
      attributes: { exclude: ["password"] },
    });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const { name, dateOfBirth, phoneNumber, confirmPassword, email, password } = req.body;
    console.log(req.body, "from body");

    let imageURL;
    console.log(req.file, "from file");

    if (req.file) imageURL = await uploadToS3(req.file, "images");

    console.log(imageURL, "from image");

    const admin = await Admin.findByPk(req.admin.id);
    if (!admin) return res.status(404).json({ message: "This Mail ID is not associated as Admin" });

    // Update fields if new values are provided
    admin.name = name || admin.name;
    admin.dateOfBirth = dateOfBirth || admin.dateOfBirth;
    admin.phoneNumber = phoneNumber || admin.phoneNumber;
    admin.email = email || admin.email;
    admin.profileImage = imageURL || admin.profileImage;

    // Validate and update password
    if (confirmPassword && password) {
      if (confirmPassword !== password) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      // Password validation (min 8 chars, 1 uppercase, 1 number, 1 symbol)
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message:
            "Password must be at least 8 characters long, contain at least one uppercase letter, one number, and one special character.",
        });
      }

      admin.password = password; // Save the new password (consider hashing it)
    }

    // Save the updated admin profile
    await admin.save();

    res.status(200).json({ message: "Profile updated successfully", admin });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


const forgotPassword = async (req, res) => {
  try {
      const { email } = req.body;
      console.log({"email is here ":email})
      
      const admin = await Admin.findOne({ where: { email } });
      if (!admin) return res.status(404).json({ message: "This Mail ID is not associated as Admin" });

      
      const token = generateToken(admin);
      console.log(token)

      
      const resetLink = `https://platix-client.vercel.app/createnewpass/${token}`;
      const subject = 'Reset Password';
      const text = `Click here to reset: ${resetLink}`;

      
      await sendEmail(email,subject,text);
      

      res.json({ message: "Reset link sent to your email" });
  } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Validate password format
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, contain at least one uppercase letter, one number, and one special character.",
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_TOKEN);
    if (!decoded) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Find admin by email
    const admin = await Admin.findOne({ where: { email: decoded.email } });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Update the password
    await admin.update({ password: newPassword });
    

    console.log({ "updated password": newPassword });
    res.json({ message: "Password reset successful" });

  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


module.exports = { registerAdmin, loginAdmin, forgotPassword, resetPassword, getAdminProfile, updateAdminProfile };
