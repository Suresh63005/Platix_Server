const Admin = require("../Models/Adminmodel");
const { generateToken } = require("../Middlewares/auth");

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

// Admin login controller (already created)
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const admin = await Admin.findOne({ where: { email } });
  
      if (!admin || !(await admin.validatePassword(password))) {
        return res.status(400).json({ message: "Invalid email or password." });
      }
  
      // Generate token
      const token = generateToken(admin);
      
      res.json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };
  
// Protected route (Admin dashboard)
const adminDashboard = (req, res) => {
  res.json({ message: "Welcome to the Admin Dashboard!", admin: req.admin });
};

module.exports = { registerAdmin, loginAdmin, adminDashboard };
