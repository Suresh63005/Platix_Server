const UserReports=require("../../Models/ReportsModel/User.model")
const asyncHandler = require("../../Middlewares/errorHandler");
const { formatDateFields } = require("../../helper/formatedDate");

const getAllUsers=asyncHandler(async(req,res)=>{
    const Users=await UserReports.findAll();
    const formatedUserStartDate=formatDateFields(Users.map(user=>user.toJSON()),["StartDate"]);
    res.json(formatedUserStartDate);
})

const CreateUser=asyncHandler(async(requestAnimationFrame,res)=>{
    const {Role,Address,MobileNo,StartDate,Username}=requestAnimationFrame.body;
    const newUser=await UserReports.create({
        Username,
        Role,
        Address,
        MobileNo,
        StartDate
    });

    res.json(newUser);
})
module.exports={getAllUsers,CreateUser};