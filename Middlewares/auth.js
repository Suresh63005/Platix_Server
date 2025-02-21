const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const Admin = require("../Models/Adminmodel"); // Import Admin model
dotenv.config();
const JWT_SECRET = process.env.JWT_TOKEN; // Use JWT_SECRET from .env

// Function to generate JWT token for admin login
const generateToken = (admin) => {
  return jwt.sign(
    { id: admin.id, email: admin.email }, 
    JWT_SECRET,
    { expiresIn: "24h" }
  );
};

// Middleware to verify JWT token for admin only
const verifyAdmin = async (req, res, next) => {
  const token = req.header("Authorization")

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET); // Verify token

    // ✅ Fetch admin from DB based on ID from token
    const admin = await Admin.findByPk(decoded.id);

    if (!admin) {
      return res.status(403).json({ message: "Access denied. Admin not found." });
    }

    req.admin = admin; // Attach admin data to the request
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

module.exports = { generateToken, verifyAdmin };
