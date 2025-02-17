const express=require("express")
const router=express.Router();
const profileController=require("../userControllers/Profile.Controller");
const upload = require("../utils/multer");

router.put("/edit",upload.single("profileImage"),profileController.editprofile);

module.exports=router