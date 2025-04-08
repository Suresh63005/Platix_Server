const express=require("express")
const router=express.Router()
const ownerController=require("../../userControllers/Owner/OwnerDashboard.Controller")
const dentistController=require("../../userControllers/Dentist/Dentist.Controller")
const authMiddleware=require("../../Middlewares/auth")

// dashboard counting data
router.get("/owner/dashboard",authMiddleware.isOwner,ownerController.labOrders);

// get all order status wise (active || close || cancelled)
router.get("/owner/getall-order/:orderStatus",authMiddleware.isOwner,ownerController.labAllOrders)



// it shown all order reports(order report and payment report) // this report should be order or payment
router.get("/owner/report/:report/:fromdate?/:todate?",authMiddleware.isOwner,ownerController.searchOrdersGetByDate)

// retrieve id of order and payment report along with their specific details
router.get("/owner/order/report/:id/:report",authMiddleware.isOwner, ownerController.labOrderAndPaymentReportGetById)

//for dashboard search
router.get("/owner/order/dashboard/search-orders",authMiddleware.isOwner, ownerController.searchOrders);

// // this will work for both order and payment search
router.get("/owner/order/search/:search",authMiddleware.isOwner,ownerController.orderAndPaymentSearch);

// for labrotory owner create order searching doctor
router.get("/owner/doctor/search/:search",authMiddleware.isOwner,ownerController.searchDoctor);

// create order
router.post("/owner/upsert",authMiddleware.isOwner,dentistController.fromDentist);

router.route("/owner/upsert/:cancel?").post(authMiddleware.isAuthenticated,dentistController.fromDentist).put(authMiddleware.isAuthenticated,dentistController.fromDentist);

// for assigning service to technician or delivery boy
router.post("/owner/assign-service",authMiddleware.isOwner,ownerController.assignService);

// create a new doctor
router.post("/owner/upsert-doctor",authMiddleware.isOwner,ownerController.upsertDoctor);

//delete notfication
// router.delete

module.exports=router