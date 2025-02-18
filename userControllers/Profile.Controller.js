const uploadToS3 = require("../config/fileUpload.aws");
const User = require("../Models/ReportsModel/User.model");

const editprofile = async (req, res) => {
    try {
        const { id } = req.body;

        // Find user by ID
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Extract fields from request body and keep existing values if not provided
        const updatedData = {
            prefix: req.body.prefix ?? user.prefix,
            firstName: req.body.firstName ?? user.firstName,
            lastName: req.body.lastName ?? user.lastName,
            hospital_name: req.body.hospital_name ?? user.hospital_name,
            registrationId: req.body.registrationId ?? user.registrationId,
            address: req.body.address ?? user.address,
            googleMapLink: req.body.googleMapLink ?? user.googleMapLink,
            email: req.body.email ?? user.email,
            mobileNo: req.body.mobileNo ?? user.mobileNo,
            type: req.body.type ?? user.type,
            profileImage: user.profileImage, 
        };

        // console.log("Uploaded File:", req.file);

        if (req.file) {
            try {
                const profileImage = await uploadToS3(req.file, "profileImage");
                updatedData.profileImage = profileImage;
                console.log("Uploaded Profile Image URL:", profileImage);
            } catch (error) {
                return res.status(500).json({ success: false, message: "Error uploading profile image", error: error.message });
            }
        }

        // Perform update
        await user.update(updatedData);

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: user, // Return updated user data
        });

    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating the profile",
            error: error.message,
        });
    }
};

const deleteAccount=async(req,res)=>{
    const { email,forceDelete } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found!",
            });
        }

        if (forceDelete === "true") {
            await user.destroy({ force: true });

            return res.status(200).json({
                success: true,
                message: "Account permanently deleted!",
            });

        } else {
            await user.destroy();

            return res.status(200).json({
                success: true,
                message: "Account soft deleted! You can restore it later if needed.",
            });
        }
    } catch (error) {
        console.error("Error deleting account:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
}
module.exports ={ editprofile , deleteAccount}