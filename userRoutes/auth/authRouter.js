const express=require("express")
const router=express.Router();
const authController=require("../../userControllers/auth/authController")

router.post("/verify-mobile",authController.verifyMobile)
router.post("/create-role",authController.RoleDetails)
router.post('/verify-otp', authController.verifyOtp);
module.exports=router