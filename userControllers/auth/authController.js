const User = require("../../Models/ReportsModel/User.model");
const admin = require("../../config/firebase-config");
const jwt = require("jsonwebtoken");

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

const RoleDetails = async (req, res) => {
    const { firstName, lastName, email, role_id, id } = req.body;

    if (!firstName || !lastName || !email || !role_id || !id) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    try {
        let user = await User.findOne({ where: { id } });
        if(!user){
            return res.status(404).json({ message: "User not found!" });
        }
        if (user) {
            await User.update(
                { firstName, lastName, email, role_id },
                { where: { id } }
            );

            return res.status(200).json({ message: "Role details updated successfully!" });
        }
    } catch (error) {
        console.error("Error assigning/updating role:", error.message);
        return res.status(500).json({ message: "Internal server error: " + error.message });
    }
};

module.exports = { verifyMobile ,RoleDetails};
