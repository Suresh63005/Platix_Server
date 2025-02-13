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
    let { mobileNo } = req.body;
    
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
            console.log(`Mobile number not found in Firebase. Creating new user: ${mobileNo}`);

            user = await admin.auth().createUser({
                phoneNumber: mobileNo,
            });
        }

        let rider = await User.findOne({ where: { mobileNo } });

        if (!rider) {
            rider = await User.create({
                mobileNo,
                email: user.email || null,
                name: user.displayName || null,
            });
            console.log("New user created !", rider);
        } else {
            console.log("user already exists !", rider);
        }

        const token = jwt.sign(
            { riderId: rider.id, mobileNo: rider.mobileNo },
            process.env.JWT_TOKEN,
        );

        return res.status(200).json({
            message: "Mobile number verified and user created successfully!",
            rider,
            token,
        });

    } catch (error) {
        console.error("Error verifying mobileNo:", error.message);

        // If Firebase throws a user-not-found error, handle it here
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
        await subscribeUser(email)
        // Generate OTP
        const otp = generateOTP();

        // Store OTP in memory with expiration time
        otpStore[id] = { otp, expiry: Date.now() + 5 * 60 * 1000 };  // Expiry after 5 minutes

        // Prepare and send OTP email using OneSignal
        const subject = 'Your OTP Code';
        const text = `Your 6-digit OTP code is: ${otp}`;
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

module.exports = { verifyMobile ,RoleDetails,verifyOtp};
