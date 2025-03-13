const express=require("express")
const router=express.Router();
const authController=require("../../userControllers/auth/authController")
const authMiddleware=require("../../Middlewares/auth")

router.post("/verify-mobile",authController.verifyMobile)
router.post("/create-role",authMiddleware.verifyAdmin,authController.RoleDetails)
router.post('/verify-otp', authController.verifyOtp);
module.exports=router