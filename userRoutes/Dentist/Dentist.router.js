const express=require("express")
const router=express.Router();
const DentistController=require("../../userControllers/Dentist/Dentist.Controller")
const authMiddleware=require("../../Middlewares/auth")
const dashBoardController = require("../../userControllers/DashBoard.Controller")


router.post("/dentist/upsert",authMiddleware.isAuthenticated,DentistController.fromDentist)//1
router.put("/dentist/upsert/:cancel?",authMiddleware.isAuthenticated,DentistController.cancelledOrders)//1
router.get("/dentist/order/getbyid/:id",authMiddleware.isAuthenticated,DentistController.orderDetailsgetById);//1
router.get("/dentist/order/report/:fromdate?/:todate?",authMiddleware.isAuthenticated,DentistController.orderReport) //1
router.get("/dentist/order/payment-report/:fromdate?/:todate?",authMiddleware.isAuthenticated,DentistController.PaymentReports)//1
router.get("/dentist/order/payment-report-getbyid/:id",authMiddleware.isAuthenticated,DentistController.paymenDetailsGetById)//1
router.get("/dentist/order/search/:search",authMiddleware.isAuthenticated, DentistController.orderAndPaymentSearch);//1
router.get("/dentist/organization-details/getbyid/:id",DentistController.getorganizationDetailsById); 

// cancelled and complted order destroy
router.put("/dentist/delete/:status",authMiddleware.isAuthenticated,DentistController.cancelledAndDestroyOrder)
//paynow
router.post("/dentist/paynow",authMiddleware.isAuthenticated,DentistController.payNow)
router.get("/dashboard/all-orders",authMiddleware.isAuthenticated,dashBoardController.allOrders)
router.get("/dashboard/all",dashBoardController.all)
router.get("/dashboard/all/organizations/search", dashBoardController.searchOrganizations);
router.get("/dashboard/all/organizationstype/search", dashBoardController.searchByOrganizationType);
router.get("/dashboard/status/:status/:userUUID",authMiddleware.isAuthenticated,dashBoardController.statusOrder)
// for settings
router.get("/settings",dashBoardController.termAndConditions)

// fetch dentist organization list
router.get("/dentist/get-dentist-organization",authMiddleware.isOwner,DentistController.fetchDentistOrganizations)


module.exports=router