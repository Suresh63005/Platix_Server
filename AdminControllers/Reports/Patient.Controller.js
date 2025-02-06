const Patient=require("../../Models/ReportsModel/Patient.model")
const asyncHandler = require("../../Middlewares/errorHandler");

const getAllPatients=asyncHandler(async(req,res)=>{
    const Patients=await Patient.findAll();
    res.json(Patients);
})

const CreatePatient=asyncHandler(async(req,res)=>{
    const {Name,Age,Gender,Problem}=req.body;
    const newPatient=await Patient.create({
        Name,
        Age,
        Gender,
        Problem,
    });

    res.json(newPatient);
})
module.exports={getAllPatients,CreatePatient};