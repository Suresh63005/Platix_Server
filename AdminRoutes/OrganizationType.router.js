const express=require("express")
const OrganizationTypeController=require("../AdminControllers/OrganizationType.controller")
const router=express.Router()

router.post("/organization/organization-type",OrganizationTypeController.OrganizationTypeUpsert);
router.get("/organization/getall",OrganizationTypeController.getAll)
router.get("/organization/getbyid/:id",OrganizationTypeController.organizationGetByid)
router.delete("/organization/delete/:id",OrganizationTypeController.organizationDelete)
module.exports=router