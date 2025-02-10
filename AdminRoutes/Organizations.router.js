const express=require("express")
const organizationsController=require("../AdminControllers/Organizations.Controller")
const upload = require("../utils/multer")
const adminMiddleware=require("../Middlewares/auth")
const router=express.Router()

router.post("/upsert",upload.fields([{name:"file1",maxCount:1},{name:"file2",maxCount:10}]),organizationsController.upsertOrganizations,)
router.get("/all",organizationsController.getAll,)
// router.get("/all",adminMiddleware.verifyAdmin,organizationsController.getAll,)
router.delete("/delete/:id",organizationsController.deleteOrganization,)
router.get("/getby/:id",organizationsController.organizationGetByid)

module.exports=router