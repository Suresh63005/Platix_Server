const express=require("express")
const router=express.Router();
const profileController=require("../userControllers/Profile.Controller");
const upload = require("../utils/multer");
const authMiddleware=require("../Middlewares/auth")

router.put("/edit",upload.single("profileImage"),authMiddleware.isAuthenticated,profileController.editprofile);
router.delete("/delete",authMiddleware.isAuthenticated,profileController.deleteAccount);

module.exports=router