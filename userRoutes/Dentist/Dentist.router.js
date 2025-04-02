const express=require("express")
const router=express.Router();
const DentistController=require("../../userControllers/Dentist/Dentist.Controller")
const authMiddleware=require("../../Middlewares/auth")
const dashBoardController = require("../../userControllers/DashBoard.Controller")


router.route("/dentist/upsert/:cancel?").post(authMiddleware.isAuthenticated,DentistController.fromDentist).put(authMiddleware.isAuthenticated,DentistController.fromDentist);//1
router.get("/dentist/order/getbyid/:id",authMiddleware.isAuthenticated,DentistController.orderDetailsgetById);//1
router.get("/dentist/order/report/:fromdate?/:todate?",authMiddleware.isAuthenticated,DentistController.orderReport) //1
router.get("/dentist/order/payment-report/:fromdate?/:todate?",authMiddleware.isAuthenticated,DentistController.PaymentReports)//1
router.get("/dentist/order/payment-report-getbyid/:id",authMiddleware.isAuthenticated,DentistController.paymenDetailsGetById)//1
router.get("/dentist/order/search/:search",authMiddleware.isAuthenticated, DentistController.orderAndPaymentSearch);//1
router.get("/dentist/organization-details/getbyid/:id",authMiddleware.isAuthenticated,DentistController.getorganizationDetailsById);
// cancelled order destroy
router.delete("/dentist/delete/:status",authMiddleware.isAuthenticated,DentistController.cancelledAndDestroyOrder)

router.get("/dashboard/all-orders",authMiddleware.isAuthenticated,dashBoardController.allOrders)
router.get("/dashboard/all",authMiddleware.isAuthenticated,dashBoardController.all)
router.get("/dashboard/all/organizations/search",authMiddleware.isAuthenticated, dashBoardController.searchOrganizations);
router.get("/dashboard/all/organizationstype/search",authMiddleware.isAuthenticated, dashBoardController.searchByOrganizationType);
router.get("/dashboard/status/:status/:userUUID",authMiddleware.isAuthenticated,dashBoardController.statusOrder)
// for settings
router.get("/settings",dashBoardController.termAndConditions)

module.exports=router