const express=require("express")
const router=express.Router()
const ownerController=require("../../userControllers/Owner/OwnerDashboard.Controller")
const dentistController=require("../../userControllers/Dentist/Dentist.Controller")
const authMiddleware=require("../../Middlewares/auth")

router.get("/owner/dashboard",authMiddleware.isOwner,ownerController.labOrders);
// get all order status wise (active || close || cancelled)
router.get("/owner/getall-order/:orderStatus",authMiddleware.isOwner,ownerController.labAllOrders)
// it shown all order reports(order report and payment report) // this report should be order or payment
router.get("/owner/report/:report",authMiddleware.isOwner,ownerController.labOrderAndPaymentReport)
// retrieve id of order and payment report along with their specific details
router.get("/owner/order/report/:id/:report",authMiddleware.isOwner, ownerController.labOrderAndPaymentReportGetById)
router.get("/owner/order/dashboard/search-orders",authMiddleware.isOwner, ownerController.searchOrders);



// this will work for both order and payment reports
router.get("/owner/order/payment/search-orders",authMiddleware.isOwner,ownerController.searchOrders);

// this will work for both order and payment search by date
router.get("/owner/report/:orderOrPayment/:fromdate?/:todate?",authMiddleware.isOwner,ownerController.searchOrdersGetByDate)
// for labrotory owner create order searching doctor
router.get("/owner/order/search",authMiddleware.isOwner,ownerController.searchDoctor);

// create order
router.post("/owner/upsert",authMiddleware.isOwner,dentistController.fromDentist);

router.route("/owner/upsert/:cancel?").post(authMiddleware.isAuthenticated,dentistController.fromDentist).put(authMiddleware.isAuthenticated,dentistController.fromDentist);

module.exports=router