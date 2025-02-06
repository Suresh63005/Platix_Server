const Admin = require("../Models/Adminmodel");
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail'); 
const { generateToken } = require('../Middlewares/auth');
const uploadToS3 = require("../config/fileUpload.aws");


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
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if the password matches the hashed password
    const isPasswordValid = await admin.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // Generate JWT token
    const token = generateToken(admin);
    res.json({ message: "Login successful", token });

  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error" });
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
    const { name, dateOfBirth, phoneNumber,confirmPassword, email, password, } = req.body;
    console.log(req.body,"frombodt")

    let imageURL; 

    console.log(req.file, "from fileeeeeeeeeee")
if(req.file)imageURL = await uploadToS3(req.file,"images")

  console.log(imageURL," from image")
    
    const admin = await Admin.findByPk(req.admin.id);

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Update fields if new values are provided
    admin.name = name || admin.name;
    admin.dateOfBirth = dateOfBirth || admin.dateOfBirth;
    admin.phoneNumber = phoneNumber || admin.phoneNumber;
    admin.email = email || admin.email;
    admin.profileImage = imageURL || admin.profileImage;

    // Directly update the password if it is provided (no hashing here)
    if (confirmPassword && password) {
      if(confirmPassword === password) admin.password = password; 
      
    }

    // Save the updated admin profile
    await admin.save();

    res.json({ message: "Profile updated successfully", admin });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};


const forgotPassword = async (req, res) => {
  try {
      const { email } = req.body;
      console.log({"email is here ":email})
      
      const admin = await Admin.findOne({ where: { email } });
      if (!admin) return res.status(404).json({ message: "Admin not found" });

      
      const token = generateToken(admin);
      console.log(token)

      
      const resetLink = `http://localhost:3000/createnewpass/${token}`;

      
      await sendEmail(email, "Reset Password", `Click here to reset: ${resetLink}`);

      res.json({ message: "Reset link sent to your email" });
  } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
      const { token } = req.params;  
      const { newPassword } = req.body;  

      
      const decoded = jwt.verify(token, process.env.JWT_TOKEN);  
      if (!decoded) return res.status(400).json({ message: "Invalid or expired token" });

      
      const admin = await Admin.findOne({ where: { email: decoded.email } });
      if (!admin) return res.status(404).json({ message: "Admin not found" });

     
      // const hashedPassword = await bcrypt.hash(newPassword, 10);

      
      await admin.update({ password: newPassword });
      console.log({"updated password":newPassword});
      res.json({ message: "Password reset successful" });  
  } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Server error", error: error.message });
  }
};


module.exports = { registerAdmin, loginAdmin, forgotPassword, resetPassword, getAdminProfile, updateAdminProfile };
