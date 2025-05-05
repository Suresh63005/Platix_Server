const express=require('express');
const router=express.Router();
const OrderReportController=require("../../AdminControllers/Reports/OrederReport.Controller");
const middleware= require('../../Middlewares/auth');

// ordered report
router.post("/order/upsertorder",middleware.verifyAdmin, OrderReportController.upsertOrderReport);
router.get("/order/getallorderedreport",middleware.verifyAdmin, OrderReportController.getAllOrderReports)
router.get("/order/getbyorderdate/:fromDate/:toDate",middleware.verifyAdmin,OrderReportController.filterByOrderDate)

module.exports=router