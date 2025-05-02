const User = require("../../Models/ReportsModel/User.model");
const admin = require("../../config/firebase-config");
const jwt = require("jsonwebtoken");
const {sendEmail,subscribeUser} = require("../../utils/sendEmail");
const TblOrganizationType = require("../../Models/TblOrganizationType.model");
const Organization = require("../../Models/Organization.model");
const TblOrganization_Service = require("../../Models/tblOrganizationService");
const Services = require("../../Models/TblServices.model");
const Roles = require("../../Models/TblRoles.model");
const { sequelize } = require("../../config/db");

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

        let userRecord = await User.findOne(
            { where: { mobileNo },
            include: [
                {
                    model: Organization,
                    as: 'organization',
                    attributes: ['id', 'name', 'upiId', 'deletedAt', 'mobile', 'email', 'whatsapp','googlemaplink'],
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
        });

        if (!userRecord) {
            userRecord = await User.create({
                mobileNo,
                email: user.email || null,
                name: user.displayName || null,
            });
            console.log("New user created in the database!", userRecord);
        } else {
            // console.log("User already exists in the database!", userRecord);
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

        const userJson=userRecord.toJSON();
        const upiId=userJson.organization?.upiId || null;

        if (userJson.organization) {
            delete userJson.organization.upiId;
        }

        const reorderedUser = {};
        for(let key in userJson){
            reorderedUser[key] = userJson[key];
            if(key === 'deletedAt'){
                reorderedUser['upiId'] = upiId;
            }
        }

        return res.status(200).json({
            message: "Mobile number verified successfully!",
            userRecord:reorderedUser,
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
    const { firstName, lastName, email, role_id } = req.body;
    const userid = req.user.id;
  
    if (!firstName || !lastName || !email || !role_id || !userid) {
      return res.status(400).json({ message: "All fields are required!" });
    }
  
    const transaction = await sequelize.transaction({ autocommit: false });
  
    try {
      // Fetch user with all fields
      const user = await User.findOne({ where: { id: userid }, transaction });
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ message: "User not found!" });
      }
  
      // Validate role
      const validateRole = await Roles.findByPk(role_id, { transaction });
      if (!validateRole) {
        await transaction.rollback();
        return res.status(404).json({ message: "Role not found!" });
      }
  
      if (!["Dentist", "dentist"].includes(validateRole.rolename)) {
        await transaction.rollback();
        return res.status(401).json({ message: "Unauthorized role" });
      }
  
      // Check if data has changed
      const isDataUnchanged =
        user.firstName === firstName &&
        user.lastName === lastName &&
        user.email === email &&
        user.role_id === role_id;
  
      if (isDataUnchanged) {
        await transaction.rollback();
        // Return all user details
        return res.status(200).json({
          message: "No changes detected. User details are already up to date.",
          user: user.dataValues // Include all fields
        });
      }
  
      // Check if a valid OTP exists
      const existingOtp = otpStore[userid];
      if (existingOtp && existingOtp.expiry > Date.now()) {
        // Update user details
        await User.update(
          { firstName, lastName, email, role_id },
          { where: { id: userid }, transaction }
        );
  
        // Fetch updated user
        const updatedUser = await User.findOne({ where: { id: userid }, transaction });
  
        await transaction.commit();
        return res.status(200).json({
          message: "Role details updated successfully. Please use the existing OTP sent to your email.",
          user: updatedUser.dataValues // Include all fields
        });
      }
  
      // Update user details
      await User.update(
        { firstName, lastName, email, role_id },
        { where: { id: userid }, transaction }
      );
  
      // Generate and store OTP
      const otp = generateOTP();
    //   console.log(otp)
      otpStore[userid] = { otp, expiry: Date.now() + 5 * 60 * 1000 }; // 5-minute expiry
  
      // Send OTP email
      const subject = 'Your OTP Code';
      const text = `Your 6-digit OTP code is: ${otp}`;
      console.log(`OTP for user ${userid}: ${otp}`);
      await sendEmail(email, subject, text);
  
      // Fetch updated user
      const updatedUser = await User.findOne({ where: { id: userid }, transaction });
  
      await transaction.commit();
  
      return res.status(200).json({
        message: "Role details updated successfully! OTP has been sent to your email.",
        user: updatedUser.dataValues // Include all fields
      });
    } catch (error) {
      if (transaction.finished !== 'commit') {
        await transaction.rollback();
      }
      console.error("Error assigning/updating role:", error.message);
      return res.status(500).json({ message: "Internal server error: " + error.message });
    }
  };

const sentEmailverify = async (req, res)=>{
    const {  email,  } = req.body;

    const id = req.user.id;

    if ( !email || !id) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    try {
        let user = await User.findOne({ where: { id } });
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

       // await subscribeUser(email)
        // Generate OTP
        const otp = generateOTP();
        console.log(otp)
        // Store OTP in memory with expiration time
        otpStore[id] = { otp, expiry: Date.now() + 10 * 60 * 1000 };  // Expiry after 10 minutes

        const subject = 'Your OTP Code';
        const text = `Your 6-digit OTP code is: ${otp}`;
        console.log(otp)
        await sendEmail(email, subject, text);

        return res.status(200).json({ message: " OTP has been sent to your email." ,user:user});

    } catch (error) {
        console.error("Error assigning/updating role:", error.message);
        return res.status(500).json({ message: "Internal server error: " + error.message });
    }

}

const verifyOtp = async (req, res) => {
    try {
      const { id, otp } = req.body;
  
      if (!id || !otp) {
        return res.status(400).json({ message: "User ID and OTP are required!" });
      }
  
      const user = await User.findOne({ where: { id } });
  
      if (!user) {
        return res.status(404).json({ message: "User not found!" });
      }
  
      const otpData = otpStore[id];
  
      if (!otpData) {
        return res.status(400).json({ message: "OTP not found or expired!" });
      }
  
      const { otp: storedOtp, expiry } = otpData;
  
      // Check expiry
      if (Date.now() > expiry) {
        delete otpStore[id];
        return res.status(400).json({ message: "OTP has expired!" });
      }
  
      // Match OTP
      if (storedOtp === otp) {
        delete otpStore[id];
        user.Email_verification = true;
        await user.save(); // ✅ Wait for DB save
        return res.status(200).json({ message: "OTP verified successfully!", user });
      }
  
      return res.status(400).json({ message: "Invalid OTP!" });
    } catch (error) {
      console.error("OTP verification error:", error);
      return res.status(500).json({ message: "Internal Server Error" });
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
        // 1. Check Firebase
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().getUserByPhoneNumber(mobileNo);
        } catch (firebaseError) {
            console.log(`Mobile number not found in Firebase: ${mobileNo}`);
            return res.status(404).json({ message: "Mobile number not found in Firebase." });
        }

        // 2. Check local DB
        const userRecord = await User.findOne({
            where: { mobileNo },
            include: [
                {
                    model: Organization,
                    as: 'organization',
                    attributes: ['id', 'name', 'upiId', 'deletedAt', 'mobile', 'email', 'whatsapp','googlemaplink'],
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
        });
        console.log(userRecord,"User Record");
        if (!userRecord) {
            return res.status(404).json({ message: "User not found in the database." });
        }

        const firebaseUID = userRecord.uid || firebaseUser.uid;

        if (registerId !== firebaseUID) {
            return res.status(400).json({ message: "Invalid register ID. It does not match the Firebase UID." });
        }

        // 3. Generate Token
        const token = jwt.sign(
            { userId: userRecord.id, mobileNo: userRecord.mobileNo, firebaseUID },
            process.env.JWT_TOKEN,
            { expiresIn: "7d" }
        );

        // 4. Reformat user and attach UPI ID separately
        const userJson = userRecord.toJSON();
        const upiId = userJson.organization?.upiId || null;

        // Clean up organization before attaching
        if (userJson.organization) {
            delete userJson.organization.upiId;
        }

        const reorderedUser = {};
        for (let key in userJson) {
            reorderedUser[key] = userJson[key];
            if (key === 'deletedAt') {
                reorderedUser['upiId'] = upiId;
            }
        }

        // Attach cleaned organization separately
        if (userJson.organization) {
            reorderedUser.organization = userJson.organization;
        }

        return res.status(200).json({
            message: "Login successful!",
            user: reorderedUser,
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




//   }
//   ListAllUsers();

  const updateOneSignal = async (req, res) => {

    const userId = req.user.id;
    if(!userId){
        return res.status(400).json({ message: "Unauthorized!" });
    }
   
    const {  one_subscription } = req.body;

    if ( !one_subscription) {
        return res.status(400).json({ message: "OneSignal ID is required!" });
    }

    try {
        const user = await User.findOne({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        let subscriptions = user.one_subscription || [];
        if (!Array.isArray(subscriptions)) {
          console.warn(`Invalid one_subscription for user ${userId}:`, user.one_subscription);
          subscriptions = [];
        }
 
        if (!subscriptions.includes(one_subscription)) {
            subscriptions.push(one_subscription);
            await User.update(
              { one_subscription: subscriptions },
              { where: { id: userId } }
            );
            console.log(`Added subscription ID ${one_subscription} for user ${userId}. Current subscriptions:`, subscriptions);
          } else {
            console.log(`Subscription ID ${one_subscription} already exists for user ${userId}`);
          }
    //   else{
    //     console.log(`Subscription ID ${one_subscription} already exists for user ${userId}`);
    // }

        // await User.update({ one_subscription }, { where: { id: userId } });

        return res.status(200).json({ message: "OneSignal ID updated successfully!" });
    } catch (error) {
        console.error("Error updating OneSignal ID:", error.message);
        return res.status(500).json({ message: "Internal server error: " + error.message });
    }
}

const removeOneSignal = async (req, res) => {
    const userId = req.user.id;
    if(!userId){
        return res.status(400).json({ message: "Unauthorized!" });
    }

    const { one_subscription } = req.body;
    
    try {
        const user = await User.findOne({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        let subscriptions = user.one_subscription || [];
        if (!Array.isArray(subscriptions)) {
          console.warn(`Invalid one_subscription for user ${userId}:`, user.one_subscription);
          subscriptions = [];
        }
        
        if (!subscriptions.includes(one_subscription)) {
            return res.status(404).json({ message: "OneSignal subscription ID not found!" });
          }

          const updatedSubscriptions = subscriptions.filter(sub => sub !== one_subscription);
          await User.update(
            { one_subscription: updatedSubscriptions },
            { where: { id: userId } }
          );
          console.log(`Removed subscription ID ${one_subscription} for user ${userId}. Current subscriptions:`, updatedSubscriptions);

        // await User.update({ one_subscription: null }, { where: { id: userId } });
        return res.status(200).json({ message: "OneSignal ID removed successfully!" });
    }
    catch (error) {
        console.error("Error removing OneSignal ID:", error.message);
        return res.status(500).json({ message: "Internal server error: " + error.message });
    }
}

module.exports = { verifyMobile ,RoleDetails,verifyOtp,loginwithnumber,updateOneSignal,removeOneSignal,sentEmailverify};
