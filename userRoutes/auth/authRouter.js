const express=require("express")
const router=express.Router();
const authController=require("../../userControllers/auth/authController")
const authMiddleware=require("../../Middlewares/auth")

// this route for dentist screen
router.post("/login/verify-mobile",authMiddleware.isAuthenticated,authController.verifyMobile) //1
router.post("/login/create-role",authMiddleware.isAuthenticated,authController.RoleDetails) //1
router.post('/login/verify-otp',authMiddleware.isAuthenticated, authController.verifyOtp);//1
// this route for all owner,technician and delivery boy
router.post('/login/login-mobile', authController.loginwithnumber);

module.exports=router