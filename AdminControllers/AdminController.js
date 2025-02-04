const Admin = require("../Models/Adminmodel");
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail'); 
const { generateToken } = require('../Middlewares/auth');


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

  

const adminDashboard = (req, res) => {
  res.json({ message: "Welcome to the Admin Dashboard!", admin: req.admin });
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


module.exports = { registerAdmin, loginAdmin, adminDashboard, forgotPassword, resetPassword };
