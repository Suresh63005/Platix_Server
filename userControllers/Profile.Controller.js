const uploadToS3 = require("../config/fileUpload.aws");
const Organization = require("../Models/Organization.model");
const User = require("../Models/ReportsModel/User.model");
const TblOrganizationType = require("../Models/TblOrganizationType.model");

const editprofile = async (req, res) => {
    try {
      const {
        id,
        prefix,
        firstName,
        lastName,
        role_id,
        hospital_name, // it may be hospital id or hospital name
        registrationId,
        address,
        googleMapLink,
        email,
        mobileNo,
        whatsappNo,
        type,
        businessName,
        googleCoordinates,
        upiId,
        is_freelancer
      } = req.body;
  
      // 1. Fetch user
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      // 2. Prepare data for update
      const updatedData = {
        prefix,
        firstName,
        lastName,
        email,
        mobileNo,
        address,
        googleMapLink,
        type,
        registrationId,
        role_id,
        whatsappNo,
        is_freelancer
      };
  
      // 3. Upload profile image if available
      if (req.file) {
        try {
          const profileImage = await uploadToS3(req.file, "profileImage");
          updatedData.profileImage = profileImage;
        } catch (error) {
          return res.status(500).json({
            success: false,
            message: "Error uploading profile image",
            error: error.message
          });
        }
      }
  
      // 4. Update user info
      await user.update(updatedData);
  
      let message = "Profile updated successfully";
      let createdOrg = false;
  
      // 5. Check if organization exists by ID
      const organization = await Organization.findOne({ where: { id: hospital_name } });
  
      if (organization) {
        await user.update({
          organization_id: organization.id,
          organizationType_id: organization.organizationType_id,
        });
      } else if (prefix?.toUpperCase() === "DR" && hospital_name) {
        // 6. Create new organization if not found
        const orgType = await TblOrganizationType.findOne({ where: { organizationType: "Dentist" } });
  
        if (!orgType) {
          return res.status(400).json({ success: false, message: "Invalid organization type" });
        }
  
        const orgData = {
          name: hospital_name,
          registrationId: "0000",
          address,
          mobile:mobileNo,
          email,
          whatsapp:whatsappNo,
          organizationType_id: orgType.id,
          businessName: businessName || null,
          googleCoordinates,
          file1: "https://media.istockphoto.com/id/1363477135/vector/cartoon-dentist-mascot-holding-teeth-and-celebrating-national-dentist-day.jpg?s=612x612&w=0&k=20&c=xLEh88Hu_UH0X2V5b5lWd8ZrBMP6kUIjV6XRuCkGjb0=",
          bankName: "NULL",
          accountNumber: "NULL",
          accountHolder: `${firstName} ${lastName}`,
          ifscCode: "NULL",
          description: "NULL",
          upiId,
          
        };
  
        const existingOrg = await Organization.findOne({ where: { mobile: mobileNo } });
  
        if (!existingOrg) {
          const newOrg = await Organization.create(orgData);
          await user.update({
            organization_id: newOrg.id,
            organizationType_id: newOrg.organizationType_id,
          });
          createdOrg = true;
          message += " and organization created";
        }
      }
  
      // 7. Return response
      return res.status(200).json({
        success: true,
        message,
        data: user,
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