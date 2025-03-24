const express=require("express")
const organizationsController=require("../AdminControllers/Organizations.Controller")
const upload = require("../utils/multer")
const adminMiddleware=require("../Middlewares/auth")
const router=express.Router()

router.post("/api/organization/upsert",upload.fields([{name:"file1",maxCount:1},{name:"file2",maxCount:3}]),organizationsController.upsertOrganizations,)
router.get("/api/organization/all",organizationsController.getAll,)
// router.get("/api/organization/all",adminMiddleware.verifyAdmin,organizationsController.getAll,)
router.delete("/api/organization/delete/:id",organizationsController.deleteOrganization,)
router.get("/api/organization/getby/:id",organizationsController.organizationGetByid)

module.exports=router