const express = require("express");
const { registerAdmin, loginAdmin,forgotPassword, resetPassword,getAdminProfile,updateAdminProfile } = require("../AdminControllers/AdminController");
const { verifyAdmin } = require("../Middlewares/auth");
const { createRole, viewRoles } = require("../AdminControllers/Roles.controller")
const {upsertService,getAllServices,deleteService,serviceGetByid} = require("../AdminControllers/Services.controller");
const upload = require("../utils/multer");
const { getSettingsById, createOrUpdateSettings, FetchSettings, FetchSettingsById } = require('../AdminControllers/Settings.controller');
const OrderReport=require("../AdminControllers/Reports/OrederReport.Controller");
const OrganizationTypeController = require("../AdminControllers/OrganizationType.controller")

const router = express.Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/profile", verifyAdmin,getAdminProfile);
router.put("/profile/update",upload.single('profileImage'), verifyAdmin,updateAdminProfile);

router.post('/forgotpassword', forgotPassword);
router.post('/createnewpass/:token', resetPassword);

router.post("/createrole" , createRole)
router.get("/viewrole", viewRoles)
router.post("/createservice", upsertService);
router.get("/getbyid/:id", serviceGetByid);

// Get All Services
router.get("/allservices", getAllServices);
router.post("/assign-service", OrganizationTypeController.assignServiceToOrganization)
router.get("/getorgservices", verifyAdmin, OrganizationTypeController.getOrganizationService)

// Delete a Service (Soft or Permanent)
router.delete("/deleteservice/:id", verifyAdmin, deleteService);

// for order
router.get("/getallorder", verifyAdmin ,OrderReport.getAllOrderReports)


router.get("/getsettings", verifyAdmin, FetchSettings);
router.get("/getbyid", verifyAdmin, FetchSettingsById);
router.put("/updatesettings", upload.single("websiteImage"), createOrUpdateSettings);

module.exports = router;