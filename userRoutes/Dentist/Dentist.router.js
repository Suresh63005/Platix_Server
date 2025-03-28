const express=require("express")
const router=express.Router();
const DentistController=require("../../userControllers/Dentist/Dentist.Controller")
const authMiddleware=require("../../Middlewares/auth")


router.route("/dentist/upsert/:cancel?").post(authMiddleware.isAuthenticated,DentistController.fromDentist).put(authMiddleware.isAuthenticated,DentistController.fromDentist);//1
router.get("/dentist/order/getbyid/:id",authMiddleware.isAuthenticated,DentistController.orderDetails);//1
router.get("/dentist/order/report/:fromdate?/:todate?",authMiddleware.isAuthenticated,DentistController.orderReport) //1
router.get("/dentist/order/payment-report/:fromdate?/:todate?",authMiddleware.isAuthenticated,DentistController.PaymentReports)//1
router.get("/dentist/order/payment-report-getbyid/:id",authMiddleware.isAuthenticated,DentistController.ViewPaymentReportDetails)//1
router.get("/dentist/order/search/:search",authMiddleware.isAuthenticated, DentistController.orderAndPaymentSearch);//1
router.get("/dentist/organization-details/getbyid/:id",authMiddleware.isAuthenticated,DentistController.getorganizationDetailsById);
// cancelled order destroy
router.delete("/dentist/delete",authMiddleware.isAuthenticated,DentistController.cancelledAndDestroyOrder)

module.exports=router