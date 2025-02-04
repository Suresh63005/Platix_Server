const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require("../Models/Adminmodel"); // Sequelize Admin model
const sendEmail = require('../utils/sendEmail'); // Email sending utility
const { generateToken } = require('../Middlewares/auth');

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if admin exists
        const admin = await Admin.findOne({ where: { email } });
        if (!admin) return res.status(404).json({ message: "Admin not found" });

        // Generate JWT token with email (expires in 15 minutes)
        const token = generateToken({ email }, "15m");

        // Construct reset password link
        const resetLink = `http://localhost:3000/createnewpass/${token}`;

        // Send email
        await sendEmail(email, "Reset Password", `Click here to reset: ${resetLink}`);

        res.json({ message: "Reset link sent to your email" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_TOKEN);
        if (!decoded) return res.status(400).json({ message: "Invalid or expired token" });

        // Find admin by email in token
        const admin = await Admin.findOne({ where: { email: decoded.email } });
        if (!admin) return res.status(404).json({ message: "Admin not found" });

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in DB
        await admin.update({ password: hashedPassword });

        res.json({ message: "Password reset successful" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
