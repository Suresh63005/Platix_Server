const express = require("express");
const { registerAdmin, loginAdmin, adminDashboard,forgotPassword, resetPassword } = require("../AdminControllers/AdminController");
const { verifyAdmin } = require("../Middlewares/auth");
const { createRole, viewRoles } = require("../AdminControllers/Roles.controller")
const {createservice, viewservice} = require("../AdminControllers/Services.controller")


const router = express.Router();


router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

router.post('/forgotpassword', forgotPassword);
router.post('/createnewpass/:token', resetPassword);

router.post("/createrole" , createRole)
router.get("/viewrole", viewRoles)


router.post("/upsert", createservice);
router.get("/viewserivce",viewservice);



module.exports = router;
