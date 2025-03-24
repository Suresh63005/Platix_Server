const express=require("express")
const UserController=require("../AdminControllers/Reports/UserReports.Controller")
const router=express.Router()

router.post("/user/upsert",UserController.CreateUser,)
router.get("/user/all",UserController.getAllUsers,)
router.get("/user/getbyid/:id",UserController.getById)
router.delete("/user/delete/:id",UserController.deleteUser)
router.get("/user/getbydate/:fromDate/:toDate",UserController.filterByDate)
router.get("/user/getbyorganization/:organization_id",UserController.getAllUsersByOrganizationName)

module.exports=router