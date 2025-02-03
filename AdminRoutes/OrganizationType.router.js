const express=require("express")
const OrganizationTypeController=require("../AdminControllers/OrganizationType.controller")
const router=express.Router()

router.post("/organization-type",OrganizationTypeController.OrganizationTypeUpsert);
router.get("/getall",OrganizationTypeController.getAll)
router.delete("/delete/:id",OrganizationTypeController.organizationDelete)
module.exports=router