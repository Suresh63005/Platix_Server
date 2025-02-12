const express=require("express")
const router=express.Router();
const authController=require("../../userControllers/auth/authController")

router.post("/verify-mobile",authController.verifyMobile)
router.post("/create-role",authController.RoleDetails)

module.exports=router