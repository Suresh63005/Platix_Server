const express=require('express');
const router=express.Router();
const UserReportController=require("../../AdminControllers/Reports/UserReports.Controller")
const PatientController=require("../../AdminControllers/Reports/Patient.Controller")
const OrderReportController=require("../../AdminControllers/Reports/OrederReport.Controller")

router.post("/upsert",UserReportController.CreateUser)
router.get("/getall",UserReportController.getAllUsers)

// for patients
router.post("/upsertpatient",PatientController.CreatePatient)
router.get("/getallpatients",PatientController.getAllPatients)

// ordered report
router.get("/getallorderedreport",OrderReportController.getAllOrderReports)

module.exports=router