const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config(); // Make sure dotenv is loaded

const JWT_SECRET = process.env.JWT_TOKEN; // Use JWT_SECRET from .env

// Function to generate JWT token for admin login
const generateToken = (admin) => {
  return jwt.sign(
    { id: admin.id, email: admin.email }, // Payload with admin details
    JWT_SECRET, // JWT secret from .env
    { expiresIn: "1h" } // Token expires in 1 hour
  );
};

// Middleware to verify JWT token for admin only
const verifyAdmin = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET); // Verify with JWT_SECRET

    // Ensure the authenticated user is an admin (Optional check)
    if (decoded.email !== "admin@example.com") {
      return res.status(403).json({ message: "Access denied. Not an admin." });
    }

    req.admin = decoded; // Attach admin data to the request
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

module.exports = { generateToken, verifyAdmin };
