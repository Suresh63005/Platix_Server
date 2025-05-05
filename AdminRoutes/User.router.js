const express=require("express")
const UserController=require("../AdminControllers/Reports/UserReports.Controller")
const router=express.Router()
const middleware=require("../Middlewares/auth")

router.post("/user/upsert",middleware.verifyAdmin,UserController.CreateUser,)
router.get("/user/all",middleware.verifyAdmin,UserController.getAllUsers,)
router.get("/user/getbyid/:id",middleware.verifyAdmin,UserController.getById)
router.delete("/user/delete/:id",middleware.verifyAdmin,UserController.deleteUser)
router.get("/user/getbydate/:fromDate/:toDate",middleware.verifyAdmin,UserController.filterByDate)
router.get("/user/getbyorganization/:organization_id",middleware.verifyAdmin,UserController.getAllUsersByOrganizationName)

module.exports=router