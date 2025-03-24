const express=require("express")
const router=express.Router();
const DentistController=require("../../userControllers/Dentist/Dentist.Controller")
const authMiddleware=require("../../Middlewares/auth")

router.route("/dentist/upsert/:cancel?").post(authMiddleware.verifyUser,DentistController.fromDentist).put(authMiddleware.verifyUser,DentistController.fromDentist);//1
router.get("/dentist/order/getbyid/:id",authMiddleware.verifyUser,DentistController.orderDetails);//1
router.get("/dentist/order/report/:fromdate?/:todate?",authMiddleware.verifyUser,DentistController.orderReport) //1
router.get("/dentist/order/payment-report/:fromdate?/:todate?",authMiddleware.verifyUser,DentistController.PaymentReports)//1
router.get("/dentist/order/payment-report-getbyid/:id",authMiddleware.verifyUser,DentistController.ViewPaymentReportDetails)//1
router.get('/dentist/order/search/:search',authMiddleware.verifyUser, DentistController.orderAndPaymentSearch);//1

// for labrotory - radiology - material supply dentist screen
router.get("/organization-details/getbyid/:id",authMiddleware.verifyUser,DentistController.getorganizationDetailsById)
module.exports=router