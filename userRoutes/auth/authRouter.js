const express=require("express")
const router=express.Router();
const authController=require("../../userControllers/auth/authController")
const authMiddleware=require("../../Middlewares/auth")

// this route for dentist screen
router.post("/verify-mobile",authController.verifyMobile)
router.post("/create-role",authMiddleware.verifyUser,authController.RoleDetails)
router.post('/verify-otp',authMiddleware.verifyUser, authController.verifyOtp);
// this route for all owner,technician and delivery boy
router.post('/login-mobile', authController.loginwithnumber);
module.exports=router