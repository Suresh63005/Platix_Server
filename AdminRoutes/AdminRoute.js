const express = require("express");
const { registerAdmin, loginAdmin,forgotPassword, resetPassword,getAdminProfile,updateAdminProfile } = require("../AdminControllers/AdminController");
// const { } = require("../Middlewares/auth");
const { createRole, viewRoles } = require("../AdminControllers/Roles.controller")
const {upsertService,getAllServices,deleteService,serviceGetByid, getorgAllServices} = require("../AdminControllers/Services.controller");
const upload = require("../utils/multer");
const { getSettingsById, createOrUpdateSettings, FetchSettings, FetchSettingsById } = require('../AdminControllers/Settings.controller');
const OrderReport=require("../AdminControllers/Reports/OrederReport.Controller");
const OrganizationTypeController = require("../AdminControllers/OrganizationType.controller");
const { verifyAdmin } = require("../Middlewares/auth");

const router = express.Router();

router.post("/admin/register", registerAdmin);
router.post("/admin/login", loginAdmin);
router.get("/admin/profile",verifyAdmin, getAdminProfile);
router.put("/admin/profile/update",verifyAdmin,upload.single('profileImage'), updateAdminProfile);

router.post('/admin/forgotpassword', forgotPassword);
router.post('/admin/createnewpass/:token', resetPassword);

router.post("/admin/createrole" ,verifyAdmin, createRole)
router.get("/admin/viewrole", viewRoles)
router.post("/admin/createservice",verifyAdmin, upsertService);
router.get("/admin/getbyid/:id",verifyAdmin, serviceGetByid);

// Get All Services
router.get("/admin/allservices",verifyAdmin, getAllServices);
router.get("/admin/allorgservices",verifyAdmin, getorgAllServices);
router.post("/admin/assign-service",verifyAdmin,OrganizationTypeController.assignServiceToOrganization)
router.get("/admin/getorgservices",verifyAdmin,  OrganizationTypeController.getOrganizationService)

// Delete a Service (Soft or Permanent)
router.delete("/admin/deleteservice/:id",verifyAdmin, deleteService);

// for order
router.get("/admin/getallorder" ,verifyAdmin,OrderReport.getAllOrderReports)


router.get("/admin/getsettings",verifyAdmin,  FetchSettings);
router.get("/admin/getbyid",verifyAdmin,  FetchSettingsById);
router.put("/admin/updatesettings",verifyAdmin, upload.single("websiteImage"), createOrUpdateSettings);

module.exports = router;
