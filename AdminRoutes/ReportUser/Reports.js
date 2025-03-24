const express=require('express');
const router=express.Router();
const OrderReportController=require("../../AdminControllers/Reports/OrederReport.Controller");
const { verifyAdmin } = require('../../Middlewares/auth');

// ordered report
router.post("/order/upsertorder", OrderReportController.upsertOrderReport);
router.get("/order/getallorderedreport", OrderReportController.getAllOrderReports)
router.get("/order/getbyorderdate/:fromDate/:toDate",OrderReportController.filterByOrderDate)

module.exports=router