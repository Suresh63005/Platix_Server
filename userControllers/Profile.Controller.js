const uploadToS3 = require("../config/fileUpload.aws");
const User = require("../Models/ReportsModel/User.model");

const editprofile = async (req, res) => {
    const {
        id,
        prefix = null,
        firstName = null,
        lastName = null,
        hospital_name = null,
        registrationId = null,
        address = null,
        googleMapLink = null,
        email = null,
        mobileNo = null,
        type = null,
    } = req.body;

    console.log(req.body);

    let profileImage = null;

    try {
        // Find user by ID
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // If a new profile image is uploaded, upload to S3
        if (req.files?.profileImage) {
            try {
                profileImage = await uploadToS3(req.files.profileImage[0], "profileImage");
            } catch (error) {
                return res.status(500).json({ message: "Error uploading profile image", error: error.message });
            }
        }

        // Prepare data for update
        const updatedData = {
            prefix,
            firstName,
            lastName,
            hospital_name,
            registrationId,
            address,
            googleMapLink,
            email,
            mobileNo,
            type,
            profileImage: profileImage || user.profileImage // ✅ Ensure it keeps the existing image if no new one is uploaded
        };

        // Perform update
        const [updatedRows] = await User.update(updatedData, { where: { id } });

        if (updatedRows === 0) {
            return res.status(400).json({ message: "No changes were made. Please check your input data." });
        }

        return res.status(200).json({ message: "Profile updated successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while updating the profile", error: error.message });
    }
};


module.exports ={editprofile}