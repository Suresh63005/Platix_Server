const express=require("express")
const OrganizationTypeController=require("../AdminControllers/OrganizationType.controller")
const router=express.Router()
const middleware=require("../Middlewares/auth")

router.post("/organization/organization-type",middleware?.verifyAdmin,OrganizationTypeController.OrganizationTypeUpsert);
router.get("/organization/getall",middleware?.verifyAdmin,OrganizationTypeController.getAll)
router.get("/organization/getbyid/:id",middleware?.verifyAdmin,OrganizationTypeController.organizationGetByid)
router.delete("/organization/delete/:id",middleware?.verifyAdmin,OrganizationTypeController.organizationDelete)
module.exports=router