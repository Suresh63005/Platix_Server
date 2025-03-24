const express=require("express")
const router=express.Router();
const DentistController=require("../../userControllers/Dentist/Dentist.Controller")
const authMiddleware=require("../../Middlewares/auth")

router.route("/upsert/:cancel?").post(authMiddleware.isAuthenticated,DentistController.fromDentist).put(authMiddleware.isAuthenticated,DentistController.fromDentist);
router.get("/order/getbyid/:id",authMiddleware.isAuthenticated,DentistController.orderDetails);
router.get("/order/report/:fromdate?/:todate?",authMiddleware.isAuthenticated,DentistController.orderReport)
router.get("/order/payment-report/:fromdate?/:todate?",authMiddleware.isAuthenticated,DentistController.PaymentReports)
router.get("/order/payment-report-getbyid/:id",authMiddleware.isAuthenticated,DentistController.ViewPaymentReportDetails)
router.get('/order/search/:search',authMiddleware.isAuthenticated, DentistController.orderAndPaymentSearch);

// for labrotory - radiology - material supply dentist screen
router.get("/organization-details/getbyid/:id",authMiddleware.isAuthenticated,DentistController.getorganizationDetailsById)
module.exports=router