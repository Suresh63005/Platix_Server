const express=require("express")
const router=express.Router();
const profileController=require("../userControllers/Profile.Controller");
const upload = require("../utils/multer");
const authMiddleWare=require("../Middlewares/auth")

router.put("/profile/edit",upload.single("profileImage"),authMiddleWare.isAuthenticated,profileController.editprofile);
router.delete("/profile/delete",authMiddleWare.isAuthenticated,profileController.deleteAccount);

module.exports=router