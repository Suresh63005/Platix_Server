const express=require('express');
const router=express.Router();
const OrderReportController=require("../../AdminControllers/Reports/OrederReport.Controller");
const { verifyAdmin } = require('../../Middlewares/auth');

// ordered report
router.post("/upsertorder", OrderReportController.upsertOrderReport);
router.get("/getallorderedreport", OrderReportController.getAllOrderReports)
router.get("/getbyorderdate/:fromDate/:toDate",OrderReportController.filterByOrderDate)

module.exports=router