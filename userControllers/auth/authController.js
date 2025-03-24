const User = require("../../Models/ReportsModel/User.model");
const admin = require("../../config/firebase-config");
const jwt = require("jsonwebtoken");
const {sendEmail,subscribeUser} = require("../../utils/sendEmail");

let otpStore={};

const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000); 
    return otp.toString(); 
};

const verifyMobile = async (req, res) => {
    let { mobileNo, registerId } = req.body;

    if (!mobileNo) {
        return res.status(400).json({ message: "Mobile number is required!" });
    }

    if (!mobileNo.startsWith("+")) {
        mobileNo = `+${mobileNo}`;
    }

    try {
        let user;
        try {
            user = await admin.auth().getUserByPhoneNumber(mobileNo);
        } catch (firebaseError) {
            console.log(`Mobile number not found in Firebase: ${mobileNo}`);
            return res.status(404).json({ message: "Mobile number not found in Firebase." });
        }

        let userRecord = await User.findOne({ where: { mobileNo } });

        if (!userRecord) {
            userRecord = await User.create({
                mobileNo,
                email: user.email || null,
                name: user.displayName || null,
            });
            console.log("New user created in the database!", userRecord);
        } else {
            console.log("User already exists in the database!", userRecord);
        }

        const firebaseUID = userRecord.uid || user.uid;

        if (registerId !== firebaseUID) {
            return res.status(400).json({
                message: "The provided registerId does not match the Firebase UID.",
            });
        }

        const token = jwt.sign(
            { userId: userRecord.id, mobileNo: userRecord.mobileNo, firebaseUID: firebaseUID },
            process.env.JWT_TOKEN,
        );

       

        return res.status(200).json({
            message: "Mobile number verified successfully!",
            userRecord,
            token,
            firebaseUID,  
        });

    } catch (error) {
        console.error("Error verifying mobileNo:", error.message);

        if (error.code === "auth/user-not-found") {
            return res.status(404).json({ message: "Mobile number not registered in Firebase." });
        }

        return res.status(500).json({ message: "Internal server error: " + error.message });
    }
};

// this role details for when user sucessfully logined  and  set their roles at that time send email otp 

const RoleDetails = async (req, res) => {
    const { firstName, lastName, email, role_id, id } = req.body;

    if (!firstName || !lastName || !email || !role_id || !id) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    try {
        let user = await User.findOne({ where: { id } });
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        // Update role details
        await User.update(
            { firstName, lastName, email, role_id },
            { where: { id } }
        );
       // await subscribeUser(email)
        // Generate OTP
        const otp = generateOTP();

        // Store OTP in memory with expiration time
        otpStore[id] = { otp, expiry: Date.now() + 5 * 60 * 1000 };  // Expiry after 5 minutes

        const subject = 'Your OTP Code';
        const text = `Your 6-digit OTP code is: ${otp}`;
        console.log(otp)
        await sendEmail(email, subject, text);

        return res.status(200).json({ message: "Role details updated successfully! OTP has been sent to your email." });

    } catch (error) {
        console.error("Error assigning/updating role:", error.message);
        return res.status(500).json({ message: "Internal server error: " + error.message });
    }
};

const verifyOtp = (req, res) => {
    const { id, otp } = req.body;

    if (!id || !otp) {
        return res.status(400).json({ message: "User ID and OTP are required!" });
    }

    const otpData = otpStore[id];

    if (!otpData) {
        return res.status(400).json({ message: "OTP not found or expired!" });
    }

    const { otp: storedOtp, expiry } = otpData;

    // Check if OTP has expired
    if (Date.now() > expiry) {
        delete otpStore[id];  // Remove expired OTP
        return res.status(400).json({ message: "OTP has expired!" });
    }

    // Verify OTP
    if (storedOtp === otp) {
        delete otpStore[id];  // Clear OTP after successful verification
        return res.status(200).json({ message: "OTP verified successfully!" });
    } else {
        return res.status(400).json({ message: "Invalid OTP!" });
    }
};

// delivery boy , owner, technician  login controller

const loginwithnumber = async (req, res) => {
    let { mobileNo, registerId } = req.body;

    if (!mobileNo || !registerId) {
        return res.status(400).json({ message: "Mobile number and Register ID are required!" });
    }

    if (!mobileNo.startsWith("+")) {
        mobileNo = `+${mobileNo}`;
    }

    try {
        // Check if the user exists in Firebase
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().getUserByPhoneNumber(mobileNo);
        } catch (firebaseError) {
            console.log(`Mobile number not found in Firebase: ${mobileNo}`);
            return res.status(404).json({ message: "Mobile number not found in Firebase." });
        }

        // Check if the user exists in the local database
        const userRecord = await User.findOne({ where: { mobileNo } });

        if (!userRecord) {
            return res.status(404).json({ message: "User not found in the database." });
        }

        // Extract UID from Firebase or Database
        const firebaseUID = userRecord.uid || firebaseUser.uid;

        if (registerId !== firebaseUID) {
            return res.status(400).json({ message: "Invalid register ID. It does not match the Firebase UID." });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { userId: userRecord.id, mobileNo: userRecord.mobileNo, firebaseUID },
            process.env.JWT_TOKEN, 
            { expiresIn: "7d" } // Set an expiration time
        );

        return res.status(200).json({
            message: "Login successful!",
            user: userRecord,
            token,
        });

    } catch (error) {
        console.error("Error during login:", error.message);

        if (error.code === "auth/user-not-found") {
            return res.status(404).json({ message: "Mobile number not registered in Firebase." });
        }

        return res.status(500).json({ message: "Internal server error: " + error.message });
    }
};


module.exports = { verifyMobile ,RoleDetails,verifyOtp,loginwithnumber};
