const express=require("express")
const router=express.Router();
const DentistController=require("../../userControllers/Dentist/Dentist.Controller")
const authMiddleware=require("../../Middlewares/auth")

router.route("/upsert/:cancel?").post(authMiddleware.verifyUser,DentistController.fromDentist).put(authMiddleware.verifyUser,DentistController.fromDentist);
router.get("/order/getbyid/:id",authMiddleware.verifyUser,DentistController.orderDetails);
router.get("/order/report/:fromdate?/:todate?",authMiddleware.verifyUser,DentistController.orderReport)
router.get("/order/payment-report/:fromdate?/:todate?",authMiddleware.verifyUser,DentistController.PaymentReports)
router.get("/order/payment-report-getbyid/:id",authMiddleware.verifyUser,DentistController.ViewPaymentReportDetails)
router.get('/order/search/:search',authMiddleware.verifyUser, DentistController.orderAndPaymentSearch);

// for labrotory - radiology - material supply dentist screen
router.get("/organization-details/getbyid/:id",authMiddleware.verifyUser,DentistController.getorganizationDetailsById)
module.exports=router