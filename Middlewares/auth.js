const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const Admin = require("../Models/Adminmodel");
const User = require("../Models/ReportsModel/User.model");
const Roles = require("../Models/TblRoles.model");
dotenv.config();
const JWT_SECRET = process.env.JWT_TOKEN;

const generateToken = (admin) => {
  return jwt.sign(
    { id: admin.id, email: admin.email },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
};

const verifyAdmin = async (req, res, next) => {
  // Checking if Authorization header is provided
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    // Remove "Bearer " prefix from the token if present
    const bearerToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    
    // Decode and verify the token
    const decoded = jwt.verify(bearerToken, JWT_SECRET);

    // Find admin by decoded ID
    const admin = await Admin.findByPk(decoded.id);

    if (!admin) {
      return res.status(403).json({ message: "Access denied. Admin not found." });
    }

    // Attach the admin object to the request for later use in routes
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token expired." });
    }
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};


const checkRoleAccess = (requiredRole) => {
  return async (req, res, next) => {
    const token = req.header("Authorization");

    if (!token) {
      console.log("No token provided.");
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
      const bearerToken = token.startsWith("Bearer ") ? token.slice(7) : token;

      const decoded = jwt.verify(bearerToken, JWT_SECRET);

      console.log("Decoded token:", decoded);

      const user = await User.findByPk(decoded.id);

      if (!user) {
        console.log("User not found in database");
        return res.status(403).json({ message: "Access denied. User not found." });
      }

      const role = await Roles.findOne({
        where: {
          id: user.role_id,
          rolename: requiredRole,
        },
      });

      if (!role) {
        console.log(`User does not have the required role '${requiredRole}'`);
        return res.status(403).json({
          message: `Access denied. User does not have the required role '${requiredRole}'.`,
        });
      }

      req.user = user;
      req.role = role;

      console.log("Role verified, proceeding to next middleware");
      next();

    } catch (error) {
      console.log("Token verification failed:", error);
      if (error.name === "TokenExpiredError") {
        return res.status(403).json({ message: "Token expired." });
      }
      return res.status(403).json({ message: "Invalid or expired token." });
    }
  };
};

module.exports = { generateToken, verifyAdmin , checkRoleAccess};
