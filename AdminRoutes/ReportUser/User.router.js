const express=require("express")
const UserController=require("../../AdminControllers/Reports/UserReports.Controller")
const router=express.Router()

router.post("/upsert",UserController.CreateUser,)
router.get("/all",UserController.getAllUsers,)


module.exports=router