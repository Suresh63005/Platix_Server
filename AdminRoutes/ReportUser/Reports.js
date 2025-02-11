const express=require('express');
const router=express.Router();
const OrderReportController=require("../../AdminControllers/Reports/OrederReport.Controller")

// ordered report
router.post("/upsertorder",OrderReportController.upsertOrderReport);
router.get("/getallorderedreport",OrderReportController.getAllOrderReports)

module.exports=router