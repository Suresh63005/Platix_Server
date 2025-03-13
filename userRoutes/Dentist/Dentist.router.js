const express=require("express")
const router=express.Router();
const DentistController=require("../../userControllers/Dentist/Dentist.Controller")
const authMiddleware=require("../../Middlewares/auth")

router.route("/upsert/:cancel?").post(DentistController.fromDentist).put(DentistController.fromDentist);
router.get("/order/getbyid/:id",DentistController.orderDetails);
router.get("/order/report/:fromdate?/:todate?",DentistController.orderReport)
router.get("/order/payment-report/:fromdate?/:todate?",DentistController.PaymentReports)
router.get("/order/payment-report-getbyid/:id",DentistController.ViewPaymentReportDetails)
router.get('/order/search/:search', DentistController.orderAndPaymentSearch);
module.exports=router