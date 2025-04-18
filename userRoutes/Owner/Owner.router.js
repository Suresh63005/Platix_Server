const express=require("express")
const router=express.Router()
const ownerController=require("../../userControllers/Owner/OwnerDashboard.Controller")
const authMiddleware=require("../../Middlewares/auth");
const upload = require("../../utils/multer")


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

// for labrotory owner create order and updating order and cancelled order also
router.route("/owner/upsert/:cancel?").post(authMiddleware.isOwner,ownerController.ownerUpsertOrder).put(authMiddleware.isOwner,ownerController.ownerUpsertOrder);

// for assigning service to technician or delivery boy
router.post("/owner/assign-service",authMiddleware.isOwner,ownerController.assignService);

// create a new doctor
router.post("/owner/upsert-doctor",authMiddleware.isOwner,ownerController.upsertDoctor);


//get all hospital name
router.get("/owner/get-hospital-name",authMiddleware.isOwner,ownerController.getAllHospitalName);
//delete notfication
// router.delete


//get all technician 
router.get("/owner/get-technician",authMiddleware.isOwner,ownerController.getAllTechnician);

//get all delivery boy
router.get("/owner/get-delivery-boy",authMiddleware.isOwner,ownerController.getAllDeliveryBoy);


router.post("/owner/upload-images",authMiddleware.isOwner,upload.array("images",4),ownerController.uploadImagesByOwner)


//delete complted and cancelled order
router.delete("/owner/delete/:status",authMiddleware.isOwner,ownerController.cancelledAndDestroyOrder)


// raiseInvoiceAndCloseOrder
router.post("/owner/raise-invoice/:id",authMiddleware.isOwner,ownerController.raiseInvoiceAndCloseOrder)

//edit invoice
router.put("/owner/edit-invoice/:id",authMiddleware.isOwner,ownerController.editInvoice)

// fetch dentist organization list
router.get("/owner/get-dentist-organization",authMiddleware.isOwner,ownerController.fetchDentistOrganizations)

module.exports=router