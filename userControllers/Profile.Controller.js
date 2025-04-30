const uploadToS3 = require("../config/fileUpload.aws");
const Organization = require("../Models/Organization.model");
const User = require("../Models/ReportsModel/User.model");
const TblOrganization_Service = require("../Models/tblOrganizationService");
const TblOrganizationType = require("../Models/TblOrganizationType.model");
const Services = require("../Models/TblServices.model");

//this is for working only dentist profile
const editprofile = async (req, res) => {
  try {
    const {

      prefix,
      firstName,
      lastName,
      role_id,
      hospital_name,
      registrationId,
      address,
      googleMapLink,
      email,
      mobileNo,
      whatsappNo,
      type,
      businessName,
      upiId,
      is_freelancer
    } = req.body;

    const id = req.user.id;
    console.log(id, "id from token");

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

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

    await user.update(updatedData);

    let message = "Profile updated successfully";
    let finalOrganization = null;

    const organization = await Organization.findOne({ where: { id: hospital_name }, paranoid: false });

    if (organization) {
      await user.update({
        organization_id: organization.id,
        organizationType_id: organization.organizationType_id,
      });
      finalOrganization = organization;
    } else if (prefix?.toUpperCase() === "DR" && hospital_name) {
      const orgType = await TblOrganizationType.findOne({ where: { organizationType: "Dentist" } });

      if (!orgType) {
        return res.status(400).json({ success: false, message: "Invalid organization type" });
      }

      const orgData = {
        name: hospital_name,
        registrationId: "0000",
        address,
        mobile: mobileNo,
        email,
        whatsapp: whatsappNo,
        organizationType_id: orgType.id,
        businessName: businessName || null,
        googleCoordinates: { "latitude": "00.000", "longitude": "00.000" },
        file1: "https://media.istockphoto.com/id/1363477135/vector/cartoon-dentist-mascot-holding-teeth-and-celebrating-national-dentist-day.jpg?s=612x612&w=0&k=20&c=xLEh88Hu_UH0X2V5b5lWd8ZrBMP6kUIjV6XRuCkGjb0=",
        bankName: "NULL",
        accountNumber: "NULL",
        accountHolder: `${firstName} ${lastName}`,
        ifscCode: "NULL",
        description: "NULL",
        upiId,
        beneficiary_id:"TEMP123456"
      };

      const existingOrg = await Organization.findOne({ where: { mobile: mobileNo }, paranoid: false });

      if (!existingOrg) {
        const newOrg = await Organization.create(orgData);
        await user.update({
          organization_id: newOrg.id,
          organizationType_id: newOrg.organizationType_id,
        });
        finalOrganization = newOrg;
        message += " and organization created";
      } else {
        finalOrganization = existingOrg;

        existingOrg.name = hospital_name;
        existingOrg.upiId = upiId;
        existingOrg.beneficiary_id="TEMP123456"

        existingOrg.save();

      }
    }

    // Prepare response without password
    const userData = user.toJSON();
    delete userData.password;

    const reorderedUser = {};
    for (const key of Object.keys(userData)) {
      reorderedUser[key] = userData[key];
      if (key === "deletedAt") {
        reorderedUser.upiId = finalOrganization?.upiId || null;
      }
    }

    if (finalOrganization) {
      reorderedUser.organization = {
        id: finalOrganization.id,
        name: finalOrganization.name,
        organizationType_id: finalOrganization.organizationType_id,
        mobile: finalOrganization.mobile,
        email: finalOrganization.email,
        whatsapp: finalOrganization.whatsapp,
        deletedAt: finalOrganization.deletedAt
      };
    }

    return res.status(200).json({
      success: true,
      message,
      data: reorderedUser
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



const deleteAccount = async (req, res) => {
  const { email, forceDelete } = req.body;
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

//edit profile for owner and technician  and delivery boy also
const ownerOrTechnicianProfileEdit = async (req, res) => {
  const {
    prefix,
    firstName,
    lastName,
    businessName,
    mobileNo,
    whatsappNo,
    email,
    address,
    googleMapLink,
    designation
  } = req.body;

  const id = req.user.id;
  console.log(id, "id from token");

  const user = await User.findByPk(id, {
    include: [
      {
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name', 'upiId', 'deletedAt', 'mobile', 'email', 'whatsapp'],
        include: [
          {
            model: TblOrganizationType,
            as: 'organizationType',
            attributes: ['id', 'organizationType'],
          },
          {
            model: TblOrganization_Service,
            as: 'organization_service',
            attributes: ['id', 'price'],
            include: [
              {
                model: Services,
                as: 'servicess',
                attributes: ['id', 'servicename', 'servicedescription'],
              }
            ]
          }
        ]
      }
    ]
  })

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" })
  }
  try {

    const updatedData = {
      prefix,
      firstName,
      lastName,
      businessName,
      mobileNo,
      whatsappNo,
      email,
      address,
      googleMapLink,
      designation
    };

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

    await user.update(updatedData);
    const userData = user;
    return res.status(200).json({ success: true, message: "Profile updated successfully", userData: userData });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });

  }
}

module.exports = { editprofile, deleteAccount, ownerOrTechnicianProfileEdit }