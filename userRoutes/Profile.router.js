const express=require("express")
const router=express.Router();
const profileController=require("../userControllers/Profile.Controller");
const upload = require("../utils/multer");
const authMiddleWare=require("../Middlewares/auth")

//this is the profile route for dentist only
router.put("/profile/edit",upload.single("profileImage"),authMiddleWare.isAuthenticated,profileController.editprofile);
router.delete("/profile/delete",authMiddleWare.isAuthenticated,profileController.deleteAccount);

//route for updating the profile data(technician and owner)
router.put("/profile/update",upload.single("profileImage"),authMiddleWare.isAuthenticated,profileController.ownerOrTechnicianProfileEdit);
module.exports=router;